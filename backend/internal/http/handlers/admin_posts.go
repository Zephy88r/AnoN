package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/store"

	"github.com/go-chi/chi/v5"
)

type AdminPostDetailDTO struct {
	ID        string `json:"id"`
	AnonID    string `json:"anon_id"`
	Text      string `json:"text"`
	CreatedAt string `json:"created_at"`
	Likes     int    `json:"likes"`
	Dislikes  int    `json:"dislikes"`
}

func AdminGetPostDetail(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := chi.URLParam(r, "id")
		if postID == "" {
			http.Error(w, "post id required", http.StatusBadRequest)
			return
		}

		post, exists := store.DefaultStore().GetPost(postID)
		if !exists {
			http.Error(w, "post not found", http.StatusNotFound)
			return
		}

		reportCount := store.DefaultStore().GetPostReportCount(postID)

		out := AdminPostDetailDTO{
			ID:        post.ID,
			AnonID:    post.AnonID,
			Text:      post.Text,
			CreatedAt: post.CreatedAt.Format(time.RFC3339),
			Likes:     post.Likes,
			Dislikes:  post.Dislikes,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"post":         out,
			"report_count": reportCount,
		})
	}
}
