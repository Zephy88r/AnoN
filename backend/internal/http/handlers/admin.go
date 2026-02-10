package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/store"
)

// ============ RESPONSE TYPES ============

type AdminPostDTO struct {
	ID        string `json:"id"`
	AnonID    string `json:"anon_id"`
	Text      string `json:"text"`
	CreatedAt string `json:"created_at"`
}

type AdminUserDTO struct {
	AnonID    string `json:"anon_id"`
	CreatedAt string `json:"created_at"`
	PostCount int    `json:"post_count"`
}

type AdminStatsResponse struct {
	TotalPosts     int     `json:"total_posts"`
	TotalUsers     int     `json:"total_users"`
	TotalSessions  int     `json:"total_sessions"`
	AvgPostsPerDay float64 `json:"avg_posts_per_day"`
	TopPosters     []struct {
		AnonID    string `json:"anon_id"`
		PostCount int    `json:"post_count"`
	} `json:"top_posters"`
}

type HealthStatus struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Uptime    string `json:"uptime"`
}

type AbuseReport struct {
	AnonID     string `json:"anon_id"`
	PostCount  int    `json:"post_count"`
	LastPostAt string `json:"last_post_at"`
	RateStatus string `json:"rate_status"` // "normal", "warning", "blocked"
}

// ============ ADMIN ENDPOINTS ============

func AdminGetPosts(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		posts := store.DefaultStore().GetFeed(1000)

		out := make([]AdminPostDTO, len(posts))
		for i, p := range posts {
			out[i] = AdminPostDTO{
				ID:        p.ID,
				AnonID:    p.AnonID,
				Text:      p.Text,
				CreatedAt: p.CreatedAt.Format(time.RFC3339),
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"posts": out,
			"total": len(out),
		})
	}
}

func AdminGetUsers(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		users := store.DefaultStore().GetAllUsers()

		out := make([]AdminUserDTO, len(users))
		for i, u := range users {
			out[i] = AdminUserDTO{
				AnonID:    u.AnonID,
				CreatedAt: u.CreatedAt.Format(time.RFC3339),
				PostCount: u.PostCount,
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"users": out,
			"total": len(out),
		})
	}
}

func AdminDeletePost(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			PostID string `json:"post_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		err := store.DefaultStore().DeletePost(req.PostID)
		if err != nil {
			http.Error(w, "failed to delete post: "+err.Error(), http.StatusInternalServerError)
			return
		}

		store.DefaultStore().LogAuditEvent(store.AuditLog{
			Action:  "admin_delete_post",
			AnonID:  "admin",
			Details: req.PostID,
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "post deleted",
			"post_id": req.PostID,
		})
	}
}

func AdminGetStats(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		posts := store.DefaultStore().GetFeed(10000)
		users := store.DefaultStore().GetAllUsers()

		stats := AdminStatsResponse{
			TotalPosts:    len(posts),
			TotalUsers:    len(users),
			TotalSessions: len(store.DefaultStore().GetAllSessions()),
		}

		// Calculate avg posts per day
		if len(posts) > 0 {
			oldest := posts[len(posts)-1].CreatedAt
			newestTime := posts[0].CreatedAt
			days := newestTime.Sub(oldest).Hours() / 24
			if days > 0 {
				stats.AvgPostsPerDay = float64(len(posts)) / days
			}
		}

		// Top posters
		type userPostCount struct {
			AnonID    string
			PostCount int
		}
		userCounts := make(map[string]int)
		for _, p := range posts {
			userCounts[p.AnonID]++
		}

		topPosters := make([]struct {
			AnonID    string `json:"anon_id"`
			PostCount int    `json:"post_count"`
		}, 0, 10)

		for anonID, count := range userCounts {
			if len(topPosters) < 10 {
				topPosters = append(topPosters, struct {
					AnonID    string `json:"anon_id"`
					PostCount int    `json:"post_count"`
				}{anonID, count})
			}
		}
		stats.TopPosters = topPosters

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	}
}

func AdminGetHealth(cfg config.Config) http.HandlerFunc {
	startTime := time.Now()

	return func(w http.ResponseWriter, r *http.Request) {
		uptime := time.Since(startTime)

		resp := HealthStatus{
			Status:    "online",
			Timestamp: time.Now().Format(time.RFC3339),
			Uptime:    uptime.String(),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}

func AdminGetSessions(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessions := store.DefaultStore().GetAllSessions()

		out := make([]struct {
			AnonID    string `json:"anon_id"`
			Token     string `json:"token"`
			ExpiresAt string `json:"expires_at"`
			CreatedAt string `json:"created_at"`
		}, len(sessions))
		for i, s := range sessions {
			out[i] = struct {
				AnonID    string `json:"anon_id"`
				Token     string `json:"token"`
				ExpiresAt string `json:"expires_at"`
				CreatedAt string `json:"created_at"`
			}{
				AnonID:    s.AnonID,
				Token:     s.Token,
				ExpiresAt: s.ExpiresAt.Format(time.RFC3339),
				CreatedAt: s.CreatedAt.Format(time.RFC3339),
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sessions": out,
			"total":    len(out),
		})
	}
}

func AdminGetTrustGraph(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get all trust requests
		requests := store.DefaultStore().GetAllTrustRequests()

		type TrustLink struct {
			From      string `json:"from"`
			To        string `json:"to"`
			Status    string `json:"status"`
			CreatedAt string `json:"created_at"`
		}

		links := make([]TrustLink, len(requests))
		for i, req := range requests {
			links[i] = TrustLink{
				From:      req.FromAnon,
				To:        req.ToAnon,
				Status:    string(req.Status),
				CreatedAt: req.CreatedAt.Format(time.RFC3339),
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"trust_links": links,
			"total":       len(links),
		})
	}
}

func AdminGetAbuseDashboard(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		posts := store.DefaultStore().GetFeed(1000)
		users := store.DefaultStore().GetAllUsers()

		// Calculate abuse metrics
		type userStats struct {
			PostCount  int
			LastPostAt time.Time
		}

		userStatsMap := make(map[string]userStats)
		for _, p := range posts {
			stats := userStatsMap[p.AnonID]
			stats.PostCount++
			if p.CreatedAt.After(stats.LastPostAt) {
				stats.LastPostAt = p.CreatedAt
			}
			userStatsMap[p.AnonID] = stats
		}

		reports := make([]AbuseReport, 0)
		for _, u := range users {
			stats := userStatsMap[u.AnonID]
			rateStatus := "normal"
			if stats.PostCount > 20 {
				rateStatus = "warning"
			}
			if stats.PostCount > 50 {
				rateStatus = "blocked"
			}

			reports = append(reports, AbuseReport{
				AnonID:     u.AnonID,
				PostCount:  stats.PostCount,
				LastPostAt: stats.LastPostAt.Format(time.RFC3339),
				RateStatus: rateStatus,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"abuse_reports": reports,
			"total_users":   len(reports),
			"warning_count": func() int {
				count := 0
				for _, r := range reports {
					if r.RateStatus != "normal" {
						count++
					}
				}
				return count
			}(),
		})
	}
}

func AdminGetAuditLog(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logs := store.DefaultStore().GetAuditLogs()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"logs":  logs,
			"total": len(logs),
		})
	}
}
