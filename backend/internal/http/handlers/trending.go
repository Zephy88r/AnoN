package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/store"
	"anon-backend/internal/types"
)

// TrendingPosts handles GET /posts/trending?limit=20&offset=0
func TrendingPosts(cfg config.Config) http.HandlerFunc {
	_ = cfg

	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		limit := 20
		offset := 0

		if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
				limit = l
			}
		}
		if limit > 50 {
			limit = 50
		}

		if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
			if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
				offset = o
			}
		}

		posts, err := store.DefaultStore().GetTrendingPosts(limit, offset)
		if err != nil {
			http.Error(w, "failed to fetch trending posts", http.StatusInternalServerError)
			return
		}

		out := make([]types.TrendingPostDTO, 0, len(posts))
		for _, post := range posts {
			userReaction, _ := store.DefaultStore().GetPostReaction(post.ID, claims.AnonID)

			out = append(out, types.TrendingPostDTO{
				PostDTO: types.PostDTO{
					ID:           post.ID,
					AnonID:       post.AnonID,
					Username:     getUsernameByAnonID(post.AnonID),
					Text:         post.Text,
					CreatedAt:    post.CreatedAt.Format(time.RFC3339),
					Likes:        post.Likes,
					Dislikes:     post.Dislikes,
					UserReaction: userReaction,
					Deleted:      post.Deleted,
				},
				LikeCount:    post.LikeCount,
				DislikeCount: post.DislikeCount,
				CommentCount: post.CommentCount,
				HotScore:     post.HotScore,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.TrendingPostsResponse{Posts: out})
	}
}
