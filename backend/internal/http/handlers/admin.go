package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/security"
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
	AnonID        string `json:"anon_id"`
	Username      string `json:"username"`
	CreatedAt     string `json:"created_at"`
	PostCount     int    `json:"post_count"`
	ReportedPosts int    `json:"reported_posts"`
	IsBanned      bool   `json:"is_banned"`
	BanLabel      string `json:"ban_label,omitempty"`
	BanExpiresAt  string `json:"ban_expires_at,omitempty"`
}

type AdminStatsResponse struct {
	TotalPosts     int     `json:"total_posts"`
	TotalUsers     int     `json:"total_users"`
	ActiveUsers    int     `json:"active_users"`
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
	AnonID       string      `json:"anon_id"`
	PostCount    int         `json:"post_count"`
	LastPostAt   string      `json:"last_post_at"`
	RateStatus   string      `json:"rate_status"` // "normal", "warning", "blocked"
	ReportedPost *ReportInfo `json:"reported_post,omitempty"`
}

type ReportInfo struct {
	PostID         string `json:"post_id"`
	ReportCount    int    `json:"report_count"`
	LastReportedAt string `json:"last_reported_at"`
	Reason         string `json:"reason,omitempty"`
}

type AdminLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AdminLoginResponse struct {
	Token string `json:"token"`
}

// ============ ADMIN ENDPOINTS ============

func AdminLogin(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req AdminLoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		email := strings.TrimSpace(req.Email)
		if email != cfg.AdminEmail || req.Password != cfg.AdminPass {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		token, err := security.SignAdminJWT(cfg.JWTSecret, cfg.JWTTTL, email)
		if err != nil {
			http.Error(w, "failed to sign admin token", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AdminLoginResponse{Token: token})
	}
}

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
		posts := store.DefaultStore().GetFeed(10000)
		now := time.Now()

		reportsByUser := make(map[string]int)
		for _, post := range posts {
			reportsByUser[post.AnonID] += store.DefaultStore().GetPostReportCount(post.ID)
		}

		out := make([]AdminUserDTO, len(users))
		for i, u := range users {
			activeBan, err := store.DefaultStore().GetActiveUserBan(u.AnonID, now)
			if err != nil {
				http.Error(w, "failed to load user bans", http.StatusInternalServerError)
				return
			}

			isBanned := activeBan != nil
			banLabel := ""
			banExpiresAt := ""
			if activeBan != nil {
				banLabel = activeBanLabel(activeBan)
				if activeBan.ExpiresAt != nil {
					banExpiresAt = activeBan.ExpiresAt.Format(time.RFC3339)
				}
			}

			out[i] = AdminUserDTO{
				AnonID:        u.AnonID,
				Username:      u.Username,
				CreatedAt:     u.CreatedAt.Format(time.RFC3339),
				PostCount:     u.PostCount,
				ReportedPosts: reportsByUser[u.AnonID],
				IsBanned:      isBanned,
				BanLabel:      banLabel,
				BanExpiresAt:  banExpiresAt,
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"users": out,
			"total": len(out),
		})
	}
}

func AdminBanUser(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			AnonID      string `json:"anon_id"`
			BanDuration string `json:"ban_duration"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		req.AnonID = strings.TrimSpace(req.AnonID)
		req.BanDuration = strings.TrimSpace(req.BanDuration)
		if req.AnonID == "" || req.BanDuration == "" {
			http.Error(w, "anon_id and ban_duration required", http.StatusBadRequest)
			return
		}

		now := time.Now()
		activeBan, err := store.DefaultStore().GetActiveUserBan(req.AnonID, now)
		if err != nil {
			http.Error(w, "failed to verify existing ban", http.StatusInternalServerError)
			return
		}
		if activeBan != nil {
			http.Error(w, fmt.Sprintf("user already banned: %s", activeBanLabel(activeBan)), http.StatusConflict)
			return
		}

		expiresAt, permanent, err := parseBanDuration(req.BanDuration, now)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := store.DefaultStore().CreateUserBan(req.AnonID, "admin moderation ban", "admin", now, expiresAt, permanent); err != nil {
			http.Error(w, "failed to create user ban", http.StatusInternalServerError)
			return
		}

		revoked, err := store.DefaultStore().RevokeAllSessionsForUser(req.AnonID)
		if err != nil {
			http.Error(w, "failed to revoke user sessions", http.StatusInternalServerError)
			return
		}

		details := fmt.Sprintf("anon_id=%s, duration=%s, permanent=%t", req.AnonID, req.BanDuration, permanent)
		if expiresAt != nil {
			details = fmt.Sprintf("%s, expires_at=%s", details, expiresAt.Format(time.RFC3339))
		}
		store.DefaultStore().LogAuditEvent(store.AuditLog{
			Action:  "ban_user",
			AnonID:  "admin",
			Details: details,
		})

		w.Header().Set("Content-Type", "application/json")
		resp := map[string]interface{}{
			"status":           "success",
			"anon_id":          req.AnonID,
			"ban_duration":     req.BanDuration,
			"is_permanent":     permanent,
			"sessions_revoked": revoked,
		}
		if expiresAt != nil {
			resp["expires_at"] = expiresAt.Format(time.RFC3339)
		}
		_ = json.NewEncoder(w).Encode(resp)
	}
}

func activeBanLabel(ban *store.UserBan) string {
	if ban == nil {
		return ""
	}
	if ban.Permanent || ban.ExpiresAt == nil {
		return "Banned permanently"
	}

	switch {
	case ban.BannedAt.Add(24 * time.Hour).Equal(*ban.ExpiresAt):
		return "Banned for 1 day"
	case ban.BannedAt.Add(72 * time.Hour).Equal(*ban.ExpiresAt):
		return "Banned for 3 days"
	case ban.BannedAt.Add(24 * time.Hour * 10).Equal(*ban.ExpiresAt):
		return "Banned for 10 days"
	case ban.BannedAt.AddDate(0, 3, 0).Equal(*ban.ExpiresAt):
		return "Banned for 3 months"
	case ban.BannedAt.AddDate(1, 0, 0).Equal(*ban.ExpiresAt):
		return "Banned for 1 year"
	default:
		return fmt.Sprintf("Banned until %s", ban.ExpiresAt.Format("2006-01-02"))
	}
}

func parseBanDuration(input string, now time.Time) (*time.Time, bool, error) {
	normalized := strings.ToLower(strings.TrimSpace(input))
	var until time.Time

	switch normalized {
	case "1day", "1 day", "1d":
		until = now.Add(24 * time.Hour)
	case "3days", "3 days", "3d":
		until = now.Add(72 * time.Hour)
	case "10days", "10 days", "10d":
		until = now.Add(24 * time.Hour * 10)
	case "3months", "3 months", "3mo":
		until = now.AddDate(0, 3, 0)
	case "1year", "1 year", "1y":
		until = now.AddDate(1, 0, 0)
	case "permanent", "perm":
		return nil, true, nil
	default:
		return nil, false, fmt.Errorf("invalid ban_duration")
	}

	return &until, false, nil
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

		// Get counts from store
		totalUsers, err := store.DefaultStore().GetTotalUsersCount()
		if err != nil {
			log.Printf("WARNING: GetTotalUsersCount failed: %v", err)
			totalUsers = 0
		}

		activeUsers, err := store.DefaultStore().GetActiveUsersCount()
		if err != nil {
			log.Printf("WARNING: GetActiveUsersCount failed: %v", err)
			activeUsers = 0
		}

		log.Printf("Admin stats: total_users=%d, active_users=%d, total_posts=%d", totalUsers, activeUsers, len(posts))

		stats := AdminStatsResponse{
			TotalPosts:    len(posts),
			TotalUsers:    totalUsers,
			ActiveUsers:   activeUsers,
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

		fallbackTopReportedByAnon := make(map[string]ReportInfo)
		for _, p := range posts {
			reportCount := store.DefaultStore().GetPostReportCount(p.ID)
			if reportCount < 1 {
				continue
			}
			current, exists := fallbackTopReportedByAnon[p.AnonID]
			if !exists || reportCount > current.ReportCount {
				fallbackTopReportedByAnon[p.AnonID] = ReportInfo{
					PostID:      p.ID,
					ReportCount: reportCount,
				}
			}
		}

		anonIDSet := make(map[string]struct{})
		for _, u := range users {
			anonIDSet[u.AnonID] = struct{}{}
		}
		for _, p := range posts {
			anonIDSet[p.AnonID] = struct{}{}
		}

		anonIDs := make([]string, 0, len(anonIDSet))
		for anonID := range anonIDSet {
			anonIDs = append(anonIDs, anonID)
		}
		sort.Strings(anonIDs)

		reports := make([]AbuseReport, 0, len(anonIDs))
		for _, anonID := range anonIDs {
			stats := userStatsMap[anonID]
			rateStatus := "normal"
			if stats.PostCount > 20 {
				rateStatus = "warning"
			}
			if stats.PostCount > 50 {
				rateStatus = "blocked"
			}

			lastPostAt := ""
			if !stats.LastPostAt.IsZero() {
				lastPostAt = stats.LastPostAt.Format(time.RFC3339)
			}

			// Get top reported post for this user if there is at least one report
			var reportedPost *ReportInfo
			topReport := store.DefaultStore().GetTopReportedPostByAnon(anonID, 1)
			if topReport != nil {
				reportedPost = &ReportInfo{
					PostID:         topReport.PostID,
					ReportCount:    topReport.ReportCount,
					LastReportedAt: topReport.LastReportedAt.Format(time.RFC3339),
					Reason:         topReport.Reason,
				}
			} else if fallback, ok := fallbackTopReportedByAnon[anonID]; ok {
				reportedPost = &ReportInfo{
					PostID:      fallback.PostID,
					ReportCount: fallback.ReportCount,
				}
			}

			reports = append(reports, AbuseReport{
				AnonID:       anonID,
				PostCount:    stats.PostCount,
				LastPostAt:   lastPostAt,
				RateStatus:   rateStatus,
				ReportedPost: reportedPost,
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

// AdminRevokeSession revokes a specific session by token
func AdminRevokeSession(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Token string `json:"token"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		if req.Token == "" {
			http.Error(w, "token required", http.StatusBadRequest)
			return
		}

		// Get session details before revoking for audit
		sess, err := store.DefaultStore().GetSessionByToken(req.Token)
		if err != nil {
			http.Error(w, "session not found", http.StatusNotFound)
			return
		}

		// Revoke the session
		if err := store.DefaultStore().RevokeSession(req.Token); err != nil {
			http.Error(w, "failed to revoke session", http.StatusInternalServerError)
			return
		}

		// Log audit event
		store.DefaultStore().LogAuditEvent(store.AuditLog{
			Action:  "revoke_session",
			AnonID:  "admin",
			Details: "Revoked session for anon_id: " + sess.AnonID,
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "success",
			"message": "session revoked",
		})
	}
}

// AdminRevokeAllUserSessions revokes all sessions for a specific user
func AdminRevokeAllUserSessions(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			AnonID string `json:"anon_id"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		if req.AnonID == "" {
			http.Error(w, "anon_id required", http.StatusBadRequest)
			return
		}

		// Revoke all sessions
		count, err := store.DefaultStore().RevokeAllSessionsForUser(req.AnonID)
		if err != nil {
			http.Error(w, "failed to revoke sessions", http.StatusInternalServerError)
			return
		}

		// Log audit event
		store.DefaultStore().LogAuditEvent(store.AuditLog{
			Action: "revoke_all_sessions",
			AnonID: "admin",
			Details: strings.Join([]string{
				"Revoked all sessions for anon_id: ", req.AnonID,
				" (count: ", string(rune(count)), ")",
			}, ""),
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":           "success",
			"message":          "all sessions revoked",
			"sessions_revoked": count,
		})
	}
}

// AdminGetUserSessions gets all sessions for a specific user
func AdminGetUserSessions(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		anonID := r.URL.Query().Get("anon_id")
		if anonID == "" {
			http.Error(w, "anon_id required", http.StatusBadRequest)
			return
		}

		sessions, err := store.DefaultStore().GetSessionsByAnonID(anonID)
		if err != nil {
			http.Error(w, "failed to get sessions", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sessions": sessions,
			"total":    len(sessions),
		})
	}
}

// AdminDeleteAuditLog deletes a single audit log entry
func AdminDeleteAuditLog(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ID string `json:"id"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		if req.ID == "" {
			http.Error(w, "id required", http.StatusBadRequest)
			return
		}

		if err := store.DefaultStore().DeleteAuditLog(req.ID); err != nil {
			http.Error(w, "failed to delete audit log", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "success",
			"message": "audit log deleted",
		})
	}
}

// AdminDeleteAuditLogs deletes multiple audit log entries
func AdminDeleteAuditLogs(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			IDs []string `json:"ids"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		if len(req.IDs) == 0 {
			http.Error(w, "ids required", http.StatusBadRequest)
			return
		}

		if err := store.DefaultStore().DeleteAuditLogs(req.IDs); err != nil {
			http.Error(w, "failed to delete audit logs", http.StatusInternalServerError)
			return
		}

		// Log the deletion action
		store.DefaultStore().LogAuditEvent(store.AuditLog{
			Action:  "delete_audit_logs",
			AnonID:  "admin",
			Details: fmt.Sprintf("deleted %d audit log entries", len(req.IDs)),
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "success",
			"message": fmt.Sprintf("%d audit logs deleted", len(req.IDs)),
			"count":   len(req.IDs),
		})
	}
}

// AdminClearAuditLogs clears all audit log entries
func AdminClearAuditLogs(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := store.DefaultStore().ClearAuditLogs(); err != nil {
			http.Error(w, "failed to clear audit logs", http.StatusInternalServerError)
			return
		}

		// Log the clear action
		store.DefaultStore().LogAuditEvent(store.AuditLog{
			Action:  "clear_audit_logs",
			AnonID:  "admin",
			Details: "cleared all audit log entries",
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "success",
			"message": "all audit logs cleared",
		})
	}
}
