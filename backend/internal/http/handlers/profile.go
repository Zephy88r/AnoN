package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/store"
	"anon-backend/internal/types"

	"github.com/go-chi/chi/v5"
)

const (
	usernameTakenMessage     = "✖ Username already taken"
	usernameAvailableMessage = "✔ Username available"
)

func ProfileMeGet(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			writeJSONError(w, http.StatusUnauthorized, "no claims")
			return
		}
		now := time.Now()
		if err := store.DefaultStore().EnsureProfileForAnon(claims.AnonID, claims.Region, now); err != nil {
			writeJSONError(w, http.StatusNotFound, "profile not found")
			return
		}

		profile, err := store.DefaultStore().GetProfileByAnonID(claims.AnonID)
		if err != nil {
			writeJSONError(w, http.StatusNotFound, "profile not found")
			return
		}
		if profile.Region == "" && strings.TrimSpace(claims.Region) != "" {
			profile.Region = strings.TrimSpace(claims.Region)
		}

		deviceInfo, err := store.DefaultStore().GetProfileDeviceInfo(claims.AnonID)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to load device info")
			return
		}

		resp := types.ProfileMeResponse{
			AnonID:               profile.AnonID,
			Username:             profile.Username,
			UsernameSuffix:       profile.UsernameSuffix,
			Bio:                  profile.Bio,
			Region:               profile.Region,
			IsRegionPublic:       profile.IsRegionPublic,
			CreatedAt:            profile.CreatedAt.Format(time.RFC3339),
			TrustScore:           profile.TrustScore,
			StatusLabel:          profile.StatusLabel,
			PostsCount:           profile.PostsCount,
			CommentsCount:        profile.CommentsCount,
			ReactionsCount:       profile.ReactionsCount,
			ProfileViews:         profile.ProfileViews,
			PrimaryDeviceActive:  deviceInfo.PrimaryDeviceActive,
			RecoveryKeyGenerated: deviceInfo.RecoveryKeyGenerated,
			SessionStatus:        deviceInfo.SessionStatus,
		}
		if deviceInfo.LastActiveAt != nil {
			resp.LastActiveAt = deviceInfo.LastActiveAt.Format(time.RFC3339)
		}
		if profile.UsernameChangedAt != nil {
			resp.UsernameChangedAt = profile.UsernameChangedAt.Format(time.RFC3339)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func ProfileMePatch(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			writeJSONError(w, http.StatusUnauthorized, "no claims")
			return
		}

		if err := store.DefaultStore().EnsureProfileForAnon(claims.AnonID, claims.Region, time.Now()); err != nil {
			writeJSONError(w, http.StatusNotFound, "profile not found")
			return
		}

		var req types.UpdateProfileRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "bad json")
			return
		}

		update := store.ProfileUpdateInput{}
		if req.UsernameSuffix != nil {
			suffix := store.NormalizeUsernameSuffix(*req.UsernameSuffix)
			if suffix == "" {
				writeJSONError(w, http.StatusBadRequest, "username suffix is required")
				return
			}
			if !store.UsernameSuffixRegex.MatchString(suffix) {
				writeJSONError(w, http.StatusBadRequest, "username suffix must match ^[a-z0-9_]{3,20}$")
				return
			}
			if store.IsReservedUsernameSuffix(suffix) {
				writeJSONError(w, http.StatusBadRequest, "this username is reserved")
				return
			}
			update.UsernameSuffix = &suffix
		}

		if req.Bio != nil {
			bio := strings.TrimSpace(*req.Bio)
			if len(bio) > 240 {
				writeJSONError(w, http.StatusBadRequest, "bio must be at most 240 characters")
				return
			}
			update.Bio = &bio
		}

		if req.IsRegionPublic != nil {
			update.IsRegionPublic = req.IsRegionPublic
		}

		profile, err := store.DefaultStore().UpdateProfile(claims.AnonID, update, time.Now())
		if err != nil {
			switch {
			case errors.Is(err, store.ErrUsernameTaken):
				writeJSONError(w, http.StatusConflict, "username already taken")
				return
			case errors.Is(err, store.ErrProfileNotFound):
				writeJSONError(w, http.StatusNotFound, "profile not found")
				return
			default:
				writeJSONError(w, http.StatusInternalServerError, "failed to update profile")
				return
			}
		}

		deviceInfo, err := store.DefaultStore().GetProfileDeviceInfo(claims.AnonID)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to load device info")
			return
		}

		resp := types.ProfileMeResponse{
			AnonID:               profile.AnonID,
			Username:             profile.Username,
			UsernameSuffix:       profile.UsernameSuffix,
			Bio:                  profile.Bio,
			Region:               profile.Region,
			IsRegionPublic:       profile.IsRegionPublic,
			CreatedAt:            profile.CreatedAt.Format(time.RFC3339),
			TrustScore:           profile.TrustScore,
			StatusLabel:          profile.StatusLabel,
			PostsCount:           profile.PostsCount,
			CommentsCount:        profile.CommentsCount,
			ReactionsCount:       profile.ReactionsCount,
			ProfileViews:         profile.ProfileViews,
			PrimaryDeviceActive:  deviceInfo.PrimaryDeviceActive,
			RecoveryKeyGenerated: deviceInfo.RecoveryKeyGenerated,
			SessionStatus:        deviceInfo.SessionStatus,
		}
		if deviceInfo.LastActiveAt != nil {
			resp.LastActiveAt = deviceInfo.LastActiveAt.Format(time.RFC3339)
		}
		if profile.UsernameChangedAt != nil {
			resp.UsernameChangedAt = profile.UsernameChangedAt.Format(time.RFC3339)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func ProfileByAnonGet(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			writeJSONError(w, http.StatusUnauthorized, "no claims")
			return
		}

		targetAnonID := strings.TrimSpace(chi.URLParam(r, "anonId"))
		if targetAnonID == "" {
			writeJSONError(w, http.StatusBadRequest, "anonId required")
			return
		}

		now := time.Now()
		if err := store.DefaultStore().EnsureProfileForAnon(targetAnonID, "", now); err != nil {
			writeJSONError(w, http.StatusNotFound, "profile not found")
			return
		}
		if claims.AnonID == targetAnonID {
			_ = store.DefaultStore().EnsureProfileForAnon(claims.AnonID, claims.Region, now)
		}

		if err := store.DefaultStore().IncrementProfileView(targetAnonID, claims.AnonID); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to update profile views")
			return
		}

		profile, err := store.DefaultStore().GetProfileByAnonID(targetAnonID)
		if err != nil {
			writeJSONError(w, http.StatusNotFound, "profile not found")
			return
		}

		resp := types.ProfilePublicResponse{
			AnonID:         profile.AnonID,
			Username:       profile.Username,
			Bio:            profile.Bio,
			IsRegionPublic: profile.IsRegionPublic,
			TrustScore:     profile.TrustScore,
			StatusLabel:    profile.StatusLabel,
			PostsCount:     profile.PostsCount,
			CommentsCount:  profile.CommentsCount,
			ReactionsCount: profile.ReactionsCount,
		}
		if profile.IsRegionPublic || claims.AnonID == targetAnonID {
			resp.Region = profile.Region
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func ProfilePostsByAnonGet(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			writeJSONError(w, http.StatusUnauthorized, "no claims")
			return
		}
		targetAnonID := strings.TrimSpace(chi.URLParam(r, "anonId"))
		if targetAnonID == "" {
			writeJSONError(w, http.StatusBadRequest, "anonId required")
			return
		}

		posts := store.DefaultStore().GetPostsByAnonID(targetAnonID, 100)
		profile, err := store.DefaultStore().GetProfileByAnonID(targetAnonID)
		if err != nil {
			writeJSONError(w, http.StatusNotFound, "profile not found")
			return
		}

		out := make([]types.PostDTO, 0, len(posts))
		for _, post := range posts {
			reaction, _ := store.DefaultStore().GetPostReaction(post.ID, claims.AnonID)
			out = append(out, types.PostDTO{
				ID:           post.ID,
				AnonID:       post.AnonID,
				Username:     profile.Username,
				Text:         post.Text,
				CreatedAt:    post.CreatedAt.Format(time.RFC3339),
				Likes:        post.Likes,
				Dislikes:     post.Dislikes,
				UserReaction: reaction,
				Deleted:      post.Deleted,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.PostFeedResponse{Posts: out})
	}
}

func UsernameCheck(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			writeJSONError(w, http.StatusUnauthorized, "no claims")
			return
		}

		username := strings.TrimSpace(r.URL.Query().Get("username"))
		if username == "" {
			writeJSONError(w, http.StatusBadRequest, "username is required")
			return
		}

		normalizedUsername := strings.ToLower(username)
		if !strings.HasPrefix(normalizedUsername, store.UsernamePrefix) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(types.UsernameCheckResponse{Available: false, Message: "✖ Username must start with ghost_"})
			return
		}

		suffix := strings.TrimPrefix(normalizedUsername, store.UsernamePrefix)
		if suffix == "" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(types.UsernameCheckResponse{Available: false, Message: "✖ Username must be at least 3 characters"})
			return
		}
		if len(suffix) < 3 {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(types.UsernameCheckResponse{Available: false, Message: "✖ Username must be at least 3 characters"})
			return
		}
		if !store.UsernameSuffixRegex.MatchString(suffix) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(types.UsernameCheckResponse{Available: false, Message: "✖ Only letters, numbers, and underscore allowed"})
			return
		}
		if store.IsReservedUsernameSuffix(suffix) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(types.UsernameCheckResponse{Available: false, Message: "✖ This name is reserved"})
			return
		}

		requested := store.BuildUsernameFromSuffix(suffix)
		currentProfile, _ := store.DefaultStore().GetProfileByAnonID(claims.AnonID)
		if currentProfile != nil && strings.EqualFold(currentProfile.Username, requested) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(types.UsernameCheckResponse{Available: true, Message: usernameAvailableMessage})
			return
		}

		available, err := store.DefaultStore().IsUsernameAvailable(requested, claims.AnonID)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to check username")
			return
		}

		message := usernameTakenMessage
		if available {
			message = usernameAvailableMessage
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.UsernameCheckResponse{Available: available, Message: message})
	}
}
