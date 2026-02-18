package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/store"

	"github.com/go-chi/chi/v5"
)

const REPORT_THRESHOLD = 3

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

		// Get the post to find the author
		post, exists := store.DefaultStore().GetPost(postID)
		if !exists {
			http.Error(w, "post not found", http.StatusNotFound)
			return
		}

		// Report the post
		now := time.Now()
		err := store.DefaultStore().ReportPost(postID, post.AnonID, claims.AnonID, req.Reason, now)
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to report post: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	}
}
