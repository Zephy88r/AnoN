package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/security"
	"anon-backend/internal/store"
	"anon-backend/internal/types"
)

func SessionBootstrap(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.BootstrapRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		if req.DeviceKey == "" {
			http.Error(w, "device_key required", http.StatusBadRequest)
			return
		}

		anonID := security.AnonID(req.DeviceKey, cfg.AnonHMACKey)
		token, err := security.SignSessionJWT(cfg.JWTSecret, cfg.JWTTTL, anonID, req.Region)
		if err != nil {
			http.Error(w, "failed to sign token", http.StatusInternalServerError)
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
			log.Printf("persist session: failed: %v", err)
			http.Error(w, "failed to persist session", http.StatusInternalServerError)
			return
		}

		// Enforce session limit per user
		if cfg.MaxSessionsPerUser > 0 {
			if err := store.DefaultStore().EnforceSessionLimit(anonID, cfg.MaxSessionsPerUser); err != nil {
				log.Printf("enforce session limit: failed: %v", err)
				// Don't fail the request, just log the error
			}
		}

		log.Printf("persist session: ok")

		resp := types.BootstrapResponse{
			Token:  token,
			AnonID: anonID, // keep for early dev; can remove later
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func SessionMe(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		exp := ""
		if claims.ExpiresAt != nil {
			exp = claims.ExpiresAt.Time.Format(time.RFC3339)
		}

		resp := types.MeResponse{
			AnonID: claims.AnonID,
			Region: claims.Region,
			ExpISO: exp,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func SessionRefresh(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		// Generate new token with extended expiration
		anonID := claims.AnonID
		region := claims.Region
		token, err := security.SignSessionJWT(cfg.JWTSecret, cfg.JWTTTL, anonID, region)
		if err != nil {
			http.Error(w, "failed to refresh token", http.StatusInternalServerError)
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
			http.Error(w, "failed to persist session", http.StatusInternalServerError)
			return
		}

		resp := types.BootstrapResponse{
			Token:  token,
			AnonID: anonID,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}
