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

func CommentCreate(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.CommentCreateRequest
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

		// Enforce max 500 chars
		if len(text) > 500 {
			http.Error(w, "comment exceeds 500 characters", http.StatusBadRequest)
			return
		}

		if req.PostID == "" {
			http.Error(w, "post_id required", http.StatusBadRequest)
			return
		}

		// Create comment ID
		commentID, err := security.NewInviteCode(16)
		if err != nil {
			http.Error(w, "failed to create comment id", http.StatusInternalServerError)
			return
		}

		now := time.Now()
		comment := &store.PostComment{
			ID:        commentID,
			PostID:    req.PostID,
			AnonID:    claims.AnonID,
			Text:      text,
			CreatedAt: now,
			Likes:     0,
			Dislikes:  0,
			Deleted:   false,
		}

		if err := store.DefaultStore().AddComment(comment); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.CommentDTO{
			ID:           comment.ID,
			PostID:       comment.PostID,
			AnonID:       comment.AnonID,
			Text:         comment.Text,
			CreatedAt:    comment.CreatedAt.Format(time.RFC3339),
			Likes:        comment.Likes,
			Dislikes:     comment.Dislikes,
			RepliesCount: 0,
			Deleted:      comment.Deleted,
		})
	}
}

func CommentGet(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		postID := r.URL.Query().Get("post_id")
		if postID == "" {
			http.Error(w, "post_id required", http.StatusBadRequest)
			return
		}

		comments := store.DefaultStore().GetComments(postID)
		out := make([]types.CommentDTO, len(comments))

		for i, comment := range comments {
			reaction, _ := store.DefaultStore().GetCommentReaction(comment.ID, claims.AnonID)
			repliesCount := store.DefaultStore().GetCommentRepliesCount(comment.ID)
			out[i] = types.CommentDTO{
				ID:           comment.ID,
				PostID:       comment.PostID,
				AnonID:       comment.AnonID,
				Text:         comment.Text,
				CreatedAt:    comment.CreatedAt.Format(time.RFC3339),
				Likes:        comment.Likes,
				Dislikes:     comment.Dislikes,
				UserReaction: reaction,
				RepliesCount: repliesCount,
				Deleted:      comment.Deleted,
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.CommentsResponse{Comments: out})
	}
}

func CommentDelete(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.CommentDeleteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		if req.CommentID == "" {
			http.Error(w, "comment_id required", http.StatusBadRequest)
			return
		}

		err := store.DefaultStore().DeleteCommentByUser(req.CommentID, claims.AnonID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
	}
}

func CommentLike(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.CommentReactionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		if req.CommentID == "" {
			http.Error(w, "comment_id required", http.StatusBadRequest)
			return
		}

		if err := store.DefaultStore().ReactToComment(req.CommentID, claims.AnonID, "like"); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		comment, ok := store.DefaultStore().GetComment(req.CommentID)
		if !ok {
			http.Error(w, "comment not found", http.StatusNotFound)
			return
		}

		reaction, _ := store.DefaultStore().GetCommentReaction(comment.ID, claims.AnonID)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.CommentDTO{
			ID:           comment.ID,
			PostID:       comment.PostID,
			AnonID:       comment.AnonID,
			Text:         comment.Text,
			CreatedAt:    comment.CreatedAt.Format(time.RFC3339),
			Likes:        comment.Likes,
			Dislikes:     comment.Dislikes,
			UserReaction: reaction,
			RepliesCount: store.DefaultStore().GetCommentRepliesCount(comment.ID),
			Deleted:      comment.Deleted,
		})
	}
}

func CommentDislike(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.CommentReactionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		if req.CommentID == "" {
			http.Error(w, "comment_id required", http.StatusBadRequest)
			return
		}

		if err := store.DefaultStore().ReactToComment(req.CommentID, claims.AnonID, "dislike"); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		comment, ok := store.DefaultStore().GetComment(req.CommentID)
		if !ok {
			http.Error(w, "comment not found", http.StatusNotFound)
			return
		}

		reaction, _ := store.DefaultStore().GetCommentReaction(comment.ID, claims.AnonID)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.CommentDTO{
			ID:           comment.ID,
			PostID:       comment.PostID,
			AnonID:       comment.AnonID,
			Text:         comment.Text,
			CreatedAt:    comment.CreatedAt.Format(time.RFC3339),
			Likes:        comment.Likes,
			Dislikes:     comment.Dislikes,
			UserReaction: reaction,
			RepliesCount: store.DefaultStore().GetCommentRepliesCount(comment.ID),
			Deleted:      comment.Deleted,
		})
	}
}

func CommentReplyCreate(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.CommentReplyCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		text := strings.TrimSpace(req.Text)
		if text == "" {
			http.Error(w, "text cannot be empty", http.StatusBadRequest)
			return
		}

		if len(text) > 500 {
			http.Error(w, "reply exceeds 500 characters", http.StatusBadRequest)
			return
		}

		if req.CommentID == "" {
			http.Error(w, "comment_id required", http.StatusBadRequest)
			return
		}

		replyID, err := security.NewInviteCode(16)
		if err != nil {
			http.Error(w, "failed to create reply id", http.StatusInternalServerError)
			return
		}

		now := time.Now()
		reply := &store.CommentReply{
			ID:        replyID,
			CommentID: req.CommentID,
			AnonID:    claims.AnonID,
			Text:      text,
			CreatedAt: now,
			Deleted:   false,
		}

		if err := store.DefaultStore().AddCommentReply(reply); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.CommentReplyDTO{
			ID:        reply.ID,
			CommentID: reply.CommentID,
			AnonID:    reply.AnonID,
			Text:      reply.Text,
			CreatedAt: reply.CreatedAt.Format(time.RFC3339),
			Deleted:   reply.Deleted,
		})
	}
}

func CommentReplyGet(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		commentID := r.URL.Query().Get("comment_id")
		if commentID == "" {
			http.Error(w, "comment_id required", http.StatusBadRequest)
			return
		}

		replies := store.DefaultStore().GetCommentReplies(commentID)
		out := make([]types.CommentReplyDTO, len(replies))

		for i, reply := range replies {
			reaction, _ := store.DefaultStore().GetReplyReaction(reply.ID, claims.AnonID)
			out[i] = types.CommentReplyDTO{
				ID:           reply.ID,
				CommentID:    reply.CommentID,
				AnonID:       reply.AnonID,
				Text:         reply.Text,
				CreatedAt:    reply.CreatedAt.Format(time.RFC3339),
				Deleted:      reply.Deleted,
				Likes:        reply.Likes,
				Dislikes:     reply.Dislikes,
				UserReaction: reaction,
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.CommentRepliesResponse{Replies: out})
	}
}

func CommentReplyDelete(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.CommentReplyDeleteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		if req.ReplyID == "" {
			http.Error(w, "reply_id required", http.StatusBadRequest)
			return
		}

		err := store.DefaultStore().DeleteCommentReplyByUser(req.ReplyID, claims.AnonID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
	}
}

func CommentReplyLike(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.CommentReplyReactionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		if req.ReplyID == "" {
			http.Error(w, "reply_id required", http.StatusBadRequest)
			return
		}

		if err := store.DefaultStore().ReactToReply(req.ReplyID, claims.AnonID, "like"); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		reply, ok := store.DefaultStore().GetReply(req.ReplyID)
		if !ok {
			http.Error(w, "reply not found", http.StatusNotFound)
			return
		}

		reaction, _ := store.DefaultStore().GetReplyReaction(reply.ID, claims.AnonID)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.CommentReplyDTO{
			ID:           reply.ID,
			CommentID:    reply.CommentID,
			AnonID:       reply.AnonID,
			Text:         reply.Text,
			CreatedAt:    reply.CreatedAt.Format(time.RFC3339),
			Deleted:      reply.Deleted,
			Likes:        reply.Likes,
			Dislikes:     reply.Dislikes,
			UserReaction: reaction,
		})
	}
}

func CommentReplyDislike(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.CommentReplyReactionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		if req.ReplyID == "" {
			http.Error(w, "reply_id required", http.StatusBadRequest)
			return
		}

		if err := store.DefaultStore().ReactToReply(req.ReplyID, claims.AnonID, "dislike"); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		reply, ok := store.DefaultStore().GetReply(req.ReplyID)
		if !ok {
			http.Error(w, "reply not found", http.StatusNotFound)
			return
		}

		reaction, _ := store.DefaultStore().GetReplyReaction(reply.ID, claims.AnonID)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.CommentReplyDTO{
			ID:           reply.ID,
			CommentID:    reply.CommentID,
			AnonID:       reply.AnonID,
			Text:         reply.Text,
			CreatedAt:    reply.CreatedAt.Format(time.RFC3339),
			Deleted:      reply.Deleted,
			Likes:        reply.Likes,
			Dislikes:     reply.Dislikes,
			UserReaction: reaction,
		})
	}
}
