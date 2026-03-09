package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/store"
	"anon-backend/internal/types"

	"github.com/go-chi/chi/v5"
)

func submitPostReport(postID, reporterAnonID, reason string) error {
	post, exists := store.DefaultStore().GetPost(postID)
	if !exists {
		return fmt.Errorf("post not found")
	}
	now := time.Now()
	if err := store.DefaultStore().ReportPost(postID, post.AnonID, reporterAnonID, reason, now); err != nil {
		return err
	}
	if err := store.DefaultStore().ReportPostV2(reporterAnonID, post.AnonID, postID, reason, now); err != nil {
		return err
	}
	return nil
}

func ReportProfile(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.ReportProfileRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		target := strings.TrimSpace(req.TargetUserAnonID)
		if target == "" {
			http.Error(w, "target_user_anon_id required", http.StatusBadRequest)
			return
		}
		if target == claims.AnonID {
			http.Error(w, "cannot report your own profile", http.StatusBadRequest)
			return
		}

		now := time.Now()
		if err := store.DefaultStore().ReportProfile(claims.AnonID, target, req.Reason, now); err != nil {
			if errors.Is(err, store.ErrAlreadyReported) {
				http.Error(w, "you already reported this profile", http.StatusConflict)
				return
			}
			http.Error(w, fmt.Sprintf("failed to report profile: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	}
}

func ReportPost(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.ReportPostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		postID := strings.TrimSpace(req.TargetPostID)
		if postID == "" {
			http.Error(w, "target_post_id required", http.StatusBadRequest)
			return
		}

		if err := submitPostReport(postID, claims.AnonID, req.Reason); err != nil {
			if errors.Is(err, store.ErrAlreadyReported) {
				http.Error(w, "you already reported this post", http.StatusConflict)
				return
			}
			if strings.Contains(strings.ToLower(err.Error()), "not found") {
				http.Error(w, "post not found", http.StatusNotFound)
				return
			}
			http.Error(w, fmt.Sprintf("failed to report post: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	}
}

func PostReport(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		// Get post ID from URL path parameter
		postID := chi.URLParam(r, "id")
		if postID == "" {
			http.Error(w, "post id required", http.StatusBadRequest)
			return
		}

		var req struct {
			Reason string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		if err := submitPostReport(postID, claims.AnonID, req.Reason); err != nil {
			if errors.Is(err, store.ErrAlreadyReported) {
				http.Error(w, "you already reported this post", http.StatusConflict)
				return
			}
			http.Error(w, fmt.Sprintf("failed to report post: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	}
}
