package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/store"
	"anon-backend/internal/types"
)

// PostSearch handles GET /posts/search?q=QUERY&limit=20&offset=0
// Supports:
// - Normal keyword search (e.g., "hero")
// - Hashtag search (e.g., "#fun")
// - Multiple hashtags (e.g., "#fun #travel" - AND logic)
// - Mixed queries (e.g., "hero #fun")
// - Typo tolerance (fuzzy matching)
func PostSearch(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		// Parse query parameters
		query := strings.TrimSpace(r.URL.Query().Get("q"))
		limitStr := r.URL.Query().Get("limit")
		offsetStr := r.URL.Query().Get("offset")

		// Default limit and offset
		limit := 20
		offset := 0

		if limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
				limit = l
				if limit > 100 {
					limit = 100 // Cap at 100
				}
			}
		}

		if offsetStr != "" {
			if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
				offset = o
			}
		}

		// Parse query to extract hashtags and keywords
		hashtags, keywords := parseSearchQuery(query)

		// Validate query
		if keywords == "" && len(hashtags) == 0 {
			http.Error(w, "search query cannot be empty", http.StatusBadRequest)
			return
		}

		// Perform search
		results, totalCount, err := store.DefaultStore().SearchPosts(keywords, hashtags, limit, offset)
		if err != nil {
			http.Error(w, "search failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Convert to DTOs
		searchResults := make([]types.SearchResult, 0, len(results))
		for _, result := range results {
			// Get user's reaction to this post
			userReaction := ""
			if reaction, exists := store.DefaultStore().GetPostReaction(result.Post.ID, claims.AnonID); exists {
				userReaction = reaction
			}

			searchResults = append(searchResults, types.SearchResult{
				Post: types.PostDTO{
					ID:           result.Post.ID,
					AnonID:       result.Post.AnonID,
					Text:         result.Post.Text,
					CreatedAt:    result.Post.CreatedAt.Format(time.RFC3339),
					Likes:        result.Post.Likes,
					Dislikes:     result.Post.Dislikes,
					UserReaction: userReaction,
					Deleted:      result.Post.Deleted,
				},
				RelevanceScore: result.RelevanceScore,
				MatchedTerms:   result.MatchedTerms,
				Highlights:     result.Highlights,
			})
		}

		// Calculate next cursor for pagination
		var nextCursor string
		if offset+limit < totalCount {
			nextCursor = strconv.Itoa(offset + limit)
		}

		response := types.SearchResponse{
			Results:    searchResults,
			Query:      query,
			TotalCount: totalCount,
			NextCursor: nextCursor,
			Hashtags:   hashtags,
			Keywords:   []string{keywords},
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
	}
}

// parseSearchQuery extracts hashtags and keywords from a search query
// Example: "hero #fun #travel" -> hashtags: ["fun", "travel"], keywords: "hero"
func parseSearchQuery(query string) ([]string, string) {
	words := strings.Fields(query)
	var hashtags []string
	var keywords []string

	for _, word := range words {
		if strings.HasPrefix(word, "#") {
			// Extract hashtag (remove # prefix, normalize to lowercase)
			tag := strings.TrimPrefix(word, "#")
			if tag != "" {
				hashtags = append(hashtags, strings.ToLower(tag))
			}
		} else {
			// Regular keyword
			keywords = append(keywords, word)
		}
	}

	// Join keywords with spaces
	keywordStr := strings.Join(keywords, " ")

	return hashtags, keywordStr
}
