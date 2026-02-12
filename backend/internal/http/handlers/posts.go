package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/security"
	"anon-backend/internal/store"
	"anon-backend/internal/types"
)

func PostCreate(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.PostCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		// Trim whitespace
		text := strings.TrimSpace(req.Text)

		// Reject empty
		if text == "" {
			http.Error(w, "text cannot be empty", http.StatusBadRequest)
			return
		}

		// Enforce max 280 chars
		if len(text) > 280 {
			http.Error(w, "text exceeds 280 characters", http.StatusBadRequest)
			return
		}

		// Check daily limit (3 posts per day)
		if !store.DefaultStore().CanCreatePost(claims.AnonID) {
			http.Error(w, "daily post limit reached", http.StatusTooManyRequests)
			return
		}

		// Create post
		postID, err := security.NewInviteCode(16)
		if err != nil {
			http.Error(w, "failed to create post id", http.StatusInternalServerError)
			return
		}

		now := time.Now()
		post := &store.Post{
			ID:        postID,
			AnonID:    claims.AnonID,
			Text:      text,
			CreatedAt: now,
			Likes:     0,
			Dislikes:  0,
			Deleted:   false,
		}

		store.DefaultStore().PutPost(post)

		// Get remaining posts count
		remainingPosts := store.DefaultStore().GetRemainingPosts(claims.AnonID)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.PostCreateResponse{
			Post: types.PostDTO{
				ID:           post.ID,
				AnonID:       post.AnonID,
				Text:         post.Text,
				CreatedAt:    post.CreatedAt.Format(time.RFC3339),
				Likes:        post.Likes,
				Dislikes:     post.Dislikes,
				UserReaction: "", // New post, no reaction yet
				Deleted:      post.Deleted,
			},
			PostsRemaining: remainingPosts,
		})
	}
}

func PostFeed(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		// Get up to 50 newest posts
		posts := store.DefaultStore().GetFeed(50)
		out := make([]types.PostDTO, len(posts))

		for i, post := range posts {
			// Get user's reaction to this post
			userReaction, _ := store.DefaultStore().GetPostReaction(post.ID, claims.AnonID)

			out[i] = types.PostDTO{
				ID:           post.ID,
				AnonID:       post.AnonID,
				Text:         post.Text,
				CreatedAt:    post.CreatedAt.Format(time.RFC3339),
				Likes:        post.Likes,
				Dislikes:     post.Dislikes,
				UserReaction: userReaction,
				Deleted:      post.Deleted,
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.PostFeedResponse{Posts: out})
	}
}

func PostRemainingCount(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		remaining := store.DefaultStore().GetRemainingPosts(claims.AnonID)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]int{"remaining": remaining})
	}
}

func PostDelete(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.PostDeleteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		if req.PostID == "" {
			http.Error(w, "post_id required", http.StatusBadRequest)
			return
		}

		err := store.DefaultStore().DeletePostByUser(req.PostID, claims.AnonID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
	}
}

func PostLike(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.PostReactionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		if req.PostID == "" {
			http.Error(w, "post_id required", http.StatusBadRequest)
			return
		}

		err := store.DefaultStore().ReactToPost(req.PostID, claims.AnonID, "like")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Get updated post
		post, found := store.DefaultStore().GetPost(req.PostID)
		if !found {
			http.Error(w, "post not found", http.StatusNotFound)
			return
		}

		// Get user's reaction
		userReaction, _ := store.DefaultStore().GetPostReaction(req.PostID, claims.AnonID)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.PostDTO{
			ID:           post.ID,
			AnonID:       post.AnonID,
			Text:         post.Text,
			CreatedAt:    post.CreatedAt.Format(time.RFC3339),
			Likes:        post.Likes,
			Dislikes:     post.Dislikes,
			UserReaction: userReaction,
			Deleted:      post.Deleted,
		})
	}
}

func PostDislike(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.PostReactionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		if req.PostID == "" {
			http.Error(w, "post_id required", http.StatusBadRequest)
			return
		}

		err := store.DefaultStore().ReactToPost(req.PostID, claims.AnonID, "dislike")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Get updated post
		post, found := store.DefaultStore().GetPost(req.PostID)
		if !found {
			http.Error(w, "post not found", http.StatusNotFound)
			return
		}

		// Get user's reaction
		userReaction, _ := store.DefaultStore().GetPostReaction(req.PostID, claims.AnonID)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.PostDTO{
			ID:           post.ID,
			AnonID:       post.AnonID,
			Text:         post.Text,
			CreatedAt:    post.CreatedAt.Format(time.RFC3339),
			Likes:        post.Likes,
			Dislikes:     post.Dislikes,
			UserReaction: userReaction,
			Deleted:      post.Deleted,
		})
	}
}
