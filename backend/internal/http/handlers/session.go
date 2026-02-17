package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/security"
	"anon-backend/internal/store"
	"anon-backend/internal/types"
)

const (
	deviceNonceTTL = 60 * time.Second
	deviceTSSkew   = 60 * time.Second
)

func DeviceChallenge(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.DeviceChallengeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "bad json")
			return
		}

		devicePublicID := strings.TrimSpace(req.DevicePublicID)
		if devicePublicID == "" {
			writeJSONError(w, http.StatusBadRequest, "device_public_id required")
			return
		}

		nonce, err := security.NewNonce(32)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to create nonce")
			return
		}

		expiresAt := time.Now().Add(deviceNonceTTL)
		if err := store.DefaultStore().CreateDeviceNonce(devicePublicID, nonce, expiresAt); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to persist nonce")
			return
		}

		resp := types.DeviceChallengeResponse{
			Nonce:        nonce,
			ExpiresInSec: int(deviceNonceTTL.Seconds()),
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func SessionBootstrap(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.BootstrapRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "bad json")
			return
		}

		devicePublicID := strings.TrimSpace(req.DevicePublicID)
		if devicePublicID == "" {
			writeJSONError(w, http.StatusBadRequest, "device_public_id required")
			return
		}
		if strings.TrimSpace(req.Nonce) == "" {
			writeJSONError(w, http.StatusBadRequest, "nonce required")
			return
		}
		if req.Ts == 0 {
			writeJSONError(w, http.StatusBadRequest, "ts required")
			return
		}
		if strings.TrimSpace(req.Proof) == "" {
			writeJSONError(w, http.StatusBadRequest, "proof required")
			return
		}

		now := time.Now()
		if skew := now.Sub(time.Unix(req.Ts, 0)); skew > deviceTSSkew || skew < -deviceTSSkew {
			writeJSONError(w, http.StatusUnauthorized, "timestamp out of range")
			return
		}

		ok, err := store.DefaultStore().ConsumeDeviceNonce(devicePublicID, req.Nonce, now)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to validate nonce")
			return
		}
		if !ok {
			writeJSONError(w, http.StatusUnauthorized, "invalid or expired nonce")
			return
		}

		device, err := store.DefaultStore().GetDevice(devicePublicID)
		if err != nil {
			if !isNotFoundErr(err) {
				writeJSONError(w, http.StatusInternalServerError, "failed to load device")
				return
			}
			device = nil
		}

		deviceSecretHash := strings.TrimSpace(req.DeviceSecretHash)
		if device == nil {
			if deviceSecretHash == "" {
				writeJSONError(w, http.StatusBadRequest, "device_secret_hash required for new device")
				return
			}
		} else {
			if deviceSecretHash != "" && deviceSecretHash != device.DeviceSecretHash {
				writeJSONError(w, http.StatusUnauthorized, "device secret mismatch")
				return
			}
			deviceSecretHash = device.DeviceSecretHash
		}

		keyBytes, err := decodeBase64(deviceSecretHash)
		if err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid device_secret_hash")
			return
		}
		message := fmt.Sprintf("%s|%s|%d", devicePublicID, req.Nonce, req.Ts)
		valid, err := security.VerifyHMACProof(keyBytes, message, req.Proof)
		if err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid proof encoding")
			return
		}
		if !valid {
			writeJSONError(w, http.StatusUnauthorized, "invalid proof")
			return
		}

		if device == nil {
			anonID := security.AnonID(devicePublicID, cfg.AnonHMACKey)
			created := false
			for i := 0; i < 12; i++ {
				username, genErr := generateUsernameCandidate()
				if genErr != nil {
					writeJSONError(w, http.StatusInternalServerError, "failed to generate username")
					return
				}

				newDevice := &store.Device{
					DevicePublicID:   devicePublicID,
					DeviceSecretHash: deviceSecretHash,
					AnonID:           anonID,
					Username:         username,
					CreatedAt:        now,
					UpdatedAt:        now,
				}
				if err := store.DefaultStore().CreateDevice(newDevice); err != nil {
					if isUsernameConflict(err) {
						continue
					}
					writeJSONError(w, http.StatusInternalServerError, "failed to create device")
					return
				}
				device = newDevice
				created = true
				break
			}
			if !created {
				writeJSONError(w, http.StatusInternalServerError, "failed to allocate username")
				return
			}
		} else {
			_ = store.DefaultStore().UpdateDeviceTimestamp(devicePublicID, now)
		}

		token, err := security.SignSessionJWT(cfg.JWTSecret, cfg.JWTTTL, device.AnonID, req.Region)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to sign token")
			return
		}
		err = store.DefaultStore().PutSession(store.SessionInfo{
			ID:             "",
			AnonID:         device.AnonID,
			Token:          token,
			IssuedAt:       now,
			ExpiresAt:      now.Add(cfg.JWTTTL),
			CreatedAt:      now,
			LastActivityAt: now,
		})
		if err != nil {
			log.Printf("persist session: failed: %v", err)
			writeJSONError(w, http.StatusInternalServerError, "failed to persist session")
			return
		}

		// Enforce session limit per user
		if cfg.MaxSessionsPerUser > 0 {
			if err := store.DefaultStore().EnforceSessionLimit(device.AnonID, cfg.MaxSessionsPerUser); err != nil {
				log.Printf("enforce session limit: failed: %v", err)
				// Don't fail the request, just log the error
			}
		}

		log.Printf("persist session: ok")

		expiresAt := now.Add(cfg.JWTTTL).Format(time.RFC3339)
		resp := types.BootstrapResponse{
			Token:     token,
			AnonID:    device.AnonID,
			Username:  device.Username,
			ExpiresAt: expiresAt,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func SessionMe(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			writeJSONError(w, http.StatusUnauthorized, "no claims")
			return
		}

		exp := ""
		if claims.ExpiresAt != nil {
			exp = claims.ExpiresAt.Time.Format(time.RFC3339)
		}

		username := ""
		if device, err := store.DefaultStore().GetDeviceByAnonID(claims.AnonID); err == nil {
			username = device.Username
		}

		resp := types.MeResponse{
			AnonID:   claims.AnonID,
			Username: username,
			Region:   claims.Region,
			ExpISO:   exp,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func SessionRefresh(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			writeJSONError(w, http.StatusUnauthorized, "no claims")
			return
		}

		// Generate new token with extended expiration
		anonID := claims.AnonID
		region := claims.Region
		token, err := security.SignSessionJWT(cfg.JWTSecret, cfg.JWTTTL, anonID, region)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to refresh token")
			return
		}

		now := time.Now()
		err = store.DefaultStore().PutSession(store.SessionInfo{
			ID:             "",
			AnonID:         anonID,
			Token:          token,
			IssuedAt:       now,
			ExpiresAt:      now.Add(cfg.JWTTTL),
			CreatedAt:      now,
			LastActivityAt: now,
		})
		if err != nil {
			log.Printf("persist refreshed session: failed: %v", err)
			writeJSONError(w, http.StatusInternalServerError, "failed to persist session")
			return
		}

		resp := types.BootstrapResponse{
			Token:     token,
			AnonID:    anonID,
			Username:  "",
			ExpiresAt: now.Add(cfg.JWTTTL).Format(time.RFC3339),
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func generateUsernameCandidate() (string, error) {
	b := make([]byte, 2)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	// Convert 2 random bytes to a number in range [10000, 99999]
	num := (uint32(b[0])<<8|uint32(b[1]))%90000 + 10000
	return fmt.Sprintf("ghost_%05d", num), nil
}

func isNotFoundErr(err error) bool {
	if err == nil {
		return false
	}
	return errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "not found")
}

func isUsernameConflict(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "username") || strings.Contains(msg, "unique")
}

func decodeBase64(input string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(input)
}
