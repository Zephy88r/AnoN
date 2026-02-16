package store

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"
)

// PgStore implements Store using PostgreSQL backend.
type PgStore struct {
	db *sql.DB
}

// NewPgStore creates a new PostgreSQL-backed store.
func NewPgStore(db *sql.DB) *PgStore {
	return &PgStore{db: db}
}

// Compile-time check that PgStore implements Store interface
var _ Store = (*PgStore)(nil)

// ===== LINK CARDS =====

func (s *PgStore) PutCard(c *LinkCard) error {
	if c.ID == "" {
		id, err := newUUID()
		if err != nil {
			return fmt.Errorf("generate link card id: %w", err)
		}
		c.ID = id
	}

	query := `
		INSERT INTO link_cards (id, code, owner_anon, status, created_at, expires_at, used_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (code) DO UPDATE SET
			status = EXCLUDED.status,
			expires_at = EXCLUDED.expires_at,
			used_by = EXCLUDED.used_by
	`
	_, err := s.db.Exec(query, c.ID, c.Code, c.OwnerAnon, c.Status, c.CreatedAt, c.ExpiresAt, c.UsedBy)
	if err != nil {
		return fmt.Errorf("put link card: %w", err)
	}
	return nil
}

func (s *PgStore) GetCard(code string) (*LinkCard, bool) {
	query := `SELECT id, code, owner_anon, status, created_at, expires_at, used_by FROM link_cards WHERE code = $1`
	row := s.db.QueryRow(query, code)

	card := &LinkCard{}
	var status sql.NullString
	var expiresAt sql.NullTime
	var usedBy sql.NullString
	err := row.Scan(&card.ID, &card.Code, &card.OwnerAnon, &status, &card.CreatedAt, &expiresAt, &usedBy)
	if err == sql.ErrNoRows {
		return nil, false
	}
	if err != nil {
		fmt.Printf("error getting card: %v\n", err)
		return nil, false
	}
	if status.Valid {
		card.Status = LinkCardStatus(status.String)
	}
	if expiresAt.Valid {
		card.ExpiresAt = expiresAt.Time
	}
	if usedBy.Valid {
		card.UsedBy = usedBy.String
	}
	return card, true
}

func (s *PgStore) CardsByOwner(owner string) []*LinkCard {
	query := `SELECT id, code, owner_anon, status, created_at, expires_at, used_by FROM link_cards WHERE owner_anon = $1 ORDER BY created_at DESC`
	rows, err := s.db.Query(query, owner)
	if err != nil {
		fmt.Printf("error querying cards: %v\n", err)
		return []*LinkCard{}
	}
	defer rows.Close()

	out := []*LinkCard{}
	for rows.Next() {
		card := &LinkCard{}
		var status sql.NullString
		var expiresAt sql.NullTime
		var usedBy sql.NullString
		if err := rows.Scan(&card.ID, &card.Code, &card.OwnerAnon, &status, &card.CreatedAt, &expiresAt, &usedBy); err != nil {
			fmt.Printf("error scanning card: %v\n", err)
			continue
		}
		if status.Valid {
			card.Status = LinkCardStatus(status.String)
		}
		if expiresAt.Valid {
			card.ExpiresAt = expiresAt.Time
		}
		if usedBy.Valid {
			card.UsedBy = usedBy.String
		}
		out = append(out, card)
	}
	return out
}

// ===== TRUST REQUESTS =====

func (s *PgStore) PutTrust(t *TrustRequest) error {
	query := `
		INSERT INTO trust_requests (id, code, from_anon, to_anon, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) DO UPDATE SET
			status = $5, updated_at = $7
	`
	_, err := s.db.Exec(query, t.ID, t.Code, t.FromAnon, t.ToAnon, t.Status, t.CreatedAt, t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("put trust request: %w", err)
	}
	return nil
}

func (s *PgStore) GetTrust(id string) (*TrustRequest, bool) {
	query := `SELECT id, code, from_anon, to_anon, status, created_at, updated_at FROM trust_requests WHERE id = $1`
	row := s.db.QueryRow(query, id)

	tr := &TrustRequest{}
	err := row.Scan(&tr.ID, &tr.Code, &tr.FromAnon, &tr.ToAnon, &tr.Status, &tr.CreatedAt, &tr.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, false
	}
	if err != nil {
		fmt.Printf("error getting trust: %v\n", err)
		return nil, false
	}
	return tr, true
}

func (s *PgStore) TrustForAnon(anon string) []*TrustRequest {
	query := `
		SELECT id, code, from_anon, to_anon, status, created_at, updated_at 
		FROM trust_requests 
		WHERE from_anon = $1 OR to_anon = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(query, anon)
	if err != nil {
		fmt.Printf("error querying trust: %v\n", err)
		return []*TrustRequest{}
	}
	defer rows.Close()

	out := []*TrustRequest{}
	for rows.Next() {
		tr := &TrustRequest{}
		if err := rows.Scan(&tr.ID, &tr.Code, &tr.FromAnon, &tr.ToAnon, &tr.Status, &tr.CreatedAt, &tr.UpdatedAt); err != nil {
			fmt.Printf("error scanning trust: %v\n", err)
			continue
		}
		out = append(out, tr)
	}
	return out
}

func (s *PgStore) TrustAccepted(a, b string) bool {
	query := `
		SELECT COUNT(*) FROM trust_requests 
		WHERE status = 'accepted' 
		AND ((from_anon = $1 AND to_anon = $2) OR (from_anon = $2 AND to_anon = $1))
	`
	var count int
	err := s.db.QueryRow(query, a, b).Scan(&count)
	if err != nil {
		fmt.Printf("error checking trust: %v\n", err)
		return false
	}
	return count > 0
}

// ===== POSTS =====

func (s *PgStore) PutPost(p *Post) {
	query := `INSERT INTO posts (id, anon_id, text, created_at, likes, dislikes, deleted) VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := s.db.Exec(query, p.ID, p.AnonID, p.Text, p.CreatedAt, p.Likes, p.Dislikes, p.Deleted)
	if err != nil {
		fmt.Printf("error putting post: %v\n", err)
	}
}

func (s *PgStore) GetFeed(limit int) []*Post {
	if limit <= 0 {
		limit = 50 // sensible default
	}
	query := `SELECT id, anon_id, text, created_at, likes, dislikes, deleted FROM posts WHERE deleted = false ORDER BY created_at DESC LIMIT $1`
	rows, err := s.db.Query(query, limit)
	if err != nil {
		fmt.Printf("error querying posts: %v\n", err)
		return []*Post{}
	}
	defer rows.Close()

	out := []*Post{}
	for rows.Next() {
		p := &Post{}
		if err := rows.Scan(&p.ID, &p.AnonID, &p.Text, &p.CreatedAt, &p.Likes, &p.Dislikes, &p.Deleted); err != nil {
			fmt.Printf("error scanning post: %v\n", err)
			continue
		}
		out = append(out, p)
	}
	return out
}

func (s *PgStore) CanCreatePost(anonID string) bool {
	dateKey := time.Now().Format("2006-01-02")

	// Check current count
	var count int
	query := `SELECT count FROM post_daily_limits WHERE anon_id = $1 AND date_key = $2`
	err := s.db.QueryRow(query, anonID, dateKey).Scan(&count)
	if err == sql.ErrNoRows {
		count = 0
	} else if err != nil {
		fmt.Printf("error checking post limit: %v\n", err)
		return false
	}

	if count >= 3 {
		return false
	}

	// Increment or insert
	upsertQuery := `
		INSERT INTO post_daily_limits (anon_id, date_key, count) 
		VALUES ($1, $2, 1)
		ON CONFLICT (anon_id, date_key) DO UPDATE SET count = post_daily_limits.count + 1
	`
	_, err = s.db.Exec(upsertQuery, anonID, dateKey)
	if err != nil {
		fmt.Printf("error updating post limit: %v\n", err)
		return false
	}

	return true
}

func (s *PgStore) GetRemainingPosts(anonID string) int {
	dateKey := time.Now().Format("2006-01-02")

	var count int
	query := `SELECT count FROM post_daily_limits WHERE anon_id = $1 AND date_key = $2`
	err := s.db.QueryRow(query, anonID, dateKey).Scan(&count)
	if err == sql.ErrNoRows {
		return 3
	}
	if err != nil {
		fmt.Printf("error checking post limit: %v\n", err)
		return 3
	}

	remaining := 3 - count
	if remaining < 0 {
		return 0
	}
	return remaining
}

// ===== GEO PINGS =====

func (s *PgStore) PutGeo(ping *GeoPing) {
	query := `INSERT INTO geo_pings (anon_id, lat, lng, timestamp) VALUES ($1, $2, $3, $4)`
	_, err := s.db.Exec(query, ping.AnonID, ping.Lat, ping.Lng, ping.Timestamp)
	if err != nil {
		fmt.Printf("error putting geo: %v\n", err)
	}
}

func (s *PgStore) GetNearby(lat, lng float64, radiusKm float64) []*GeoPing {
	cutoff := time.Now().Add(-10 * time.Minute)

	// Use PostgreSQL earth distance or simple Haversine in SQL
	// For now, fetch recent pings and filter in memory (can optimize later with PostGIS)
	query := `
		SELECT anon_id, lat, lng, timestamp 
		FROM geo_pings 
		WHERE timestamp > $1
		ORDER BY timestamp DESC
		LIMIT 100
	`

	rows, err := s.db.Query(query, cutoff)
	if err != nil {
		fmt.Printf("error querying geo: %v\n", err)
		return []*GeoPing{}
	}
	defer rows.Close()

	out := []*GeoPing{}
	for rows.Next() {
		ping := &GeoPing{}
		if err := rows.Scan(&ping.AnonID, &ping.Lat, &ping.Lng, &ping.Timestamp); err != nil {
			fmt.Printf("error scanning geo: %v\n", err)
			continue
		}

		// Filter by distance using haversine
		dist := haversineDistance(lat, lng, ping.Lat, ping.Lng)
		if dist <= radiusKm {
			out = append(out, ping)
		}
	}

	return out
}

// ===== ADMIN METHODS =====

func (s *PgStore) GetAllUsers() []*UserInfo {
	query := `
		SELECT anon_id, MIN(created_at) AS created_at, COUNT(*) AS post_count
		FROM posts
		GROUP BY anon_id
		ORDER BY post_count DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		fmt.Printf("error querying users: %v\n", err)
		return []*UserInfo{}
	}
	defer rows.Close()

	out := []*UserInfo{}
	for rows.Next() {
		u := &UserInfo{}
		if err := rows.Scan(&u.AnonID, &u.CreatedAt, &u.PostCount); err != nil {
			fmt.Printf("error scanning user: %v\n", err)
			continue
		}
		out = append(out, u)
	}
	return out
}

func (s *PgStore) GetAllSessions() []*SessionInfo {
	query := `
		SELECT
			COALESCE(id::text, ''),
			anon_id,
			COALESCE(token, ''),
			expires_at,
			COALESCE(issued_at, created_at),
			COALESCE(created_at, issued_at),
			COALESCE(last_activity_at, issued_at, created_at)
		FROM sessions
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		fmt.Printf("error querying sessions: %v\n", err)
		return []*SessionInfo{}
	}
	defer rows.Close()

	out := []*SessionInfo{}
	for rows.Next() {
		s := &SessionInfo{}
		if err := rows.Scan(&s.ID, &s.AnonID, &s.Token, &s.ExpiresAt, &s.IssuedAt, &s.CreatedAt, &s.LastActivityAt); err != nil {
			fmt.Printf("error scanning session: %v\n", err)
			continue
		}
		out = append(out, s)
	}
	return out
}

func (s *PgStore) PutSession(session SessionInfo) error {
	issuedAt := session.IssuedAt
	if issuedAt.IsZero() {
		issuedAt = session.CreatedAt
		if issuedAt.IsZero() {
			issuedAt = time.Now()
		}
	}

	createdAt := session.CreatedAt
	if createdAt.IsZero() {
		createdAt = issuedAt
	}

	lastActivityAt := session.LastActivityAt
	if lastActivityAt.IsZero() {
		lastActivityAt = issuedAt
	}

	if session.ID == "" {
		id, err := newUUID()
		if err != nil {
			return fmt.Errorf("generate session id: %w", err)
		}
		session.ID = id
	}

	query := `
		INSERT INTO sessions (id, anon_id, issued_at, expires_at, token, created_at, last_activity_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := s.db.Exec(query, session.ID, session.AnonID, issuedAt, session.ExpiresAt, session.Token, createdAt, lastActivityAt)
	if err != nil {
		return fmt.Errorf("put session: %w", err)
	}
	return nil
}

func newUUID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	// RFC 4122 variant and version (4)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80

	encoded := hex.EncodeToString(b)
	return fmt.Sprintf("%s-%s-%s-%s-%s", encoded[0:8], encoded[8:12], encoded[12:16], encoded[16:20], encoded[20:32]), nil
}

func (s *PgStore) GetAllTrustRequests() []*TrustRequest {
	query := `
		SELECT id, code, from_anon, to_anon, status, created_at, updated_at
		FROM trust_requests
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(query)
	if err != nil {
		fmt.Printf("error querying trust requests: %v\n", err)
		return []*TrustRequest{}
	}
	defer rows.Close()

	out := []*TrustRequest{}
	for rows.Next() {
		tr := &TrustRequest{}
		if err := rows.Scan(&tr.ID, &tr.Code, &tr.FromAnon, &tr.ToAnon, &tr.Status, &tr.CreatedAt, &tr.UpdatedAt); err != nil {
			fmt.Printf("error scanning trust: %v\n", err)
			continue
		}
		out = append(out, tr)
	}
	return out
}

func (s *PgStore) GetAuditLogs() []AuditLog {
	query := `SELECT id, action, anon_id, details, timestamp FROM audit_logs ORDER BY timestamp DESC`
	rows, err := s.db.Query(query)
	if err != nil {
		fmt.Printf("error querying audit logs: %v\n", err)
		return []AuditLog{}
	}
	defer rows.Close()

	out := []AuditLog{}
	for rows.Next() {
		log := AuditLog{}
		if err := rows.Scan(&log.ID, &log.Action, &log.AnonID, &log.Details, &log.Timestamp); err != nil {
			fmt.Printf("error scanning audit log: %v\n", err)
			continue
		}
		out = append(out, log)
	}
	return out
}

func (s *PgStore) DeletePost(postID string) error {
	query := `DELETE FROM posts WHERE id = $1`
	_, err := s.db.Exec(query, postID)
	if err != nil {
		return fmt.Errorf("delete post: %w", err)
	}
	return nil
}

// Session management methods
func (s *PgStore) UpdateSessionActivity(token string) error {
	query := `UPDATE sessions SET last_activity_at = $1 WHERE token = $2`
	_, err := s.db.Exec(query, time.Now(), token)
	if err != nil {
		return fmt.Errorf("update session activity: %w", err)
	}
	return nil
}

func (s *PgStore) CleanupExpiredSessions() (int, error) {
	query := `DELETE FROM sessions WHERE expires_at < $1`
	result, err := s.db.Exec(query, time.Now())
	if err != nil {
		return 0, fmt.Errorf("cleanup expired sessions: %w", err)
	}

	count, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("get rows affected: %w", err)
	}

	return int(count), nil
}

func (s *PgStore) GetSessionByToken(token string) (*SessionInfo, error) {
	query := `
		SELECT id, anon_id, issued_at, expires_at, token, created_at, COALESCE(last_activity_at, issued_at)
		FROM sessions 
		WHERE token = $1
	`
	sess := &SessionInfo{}
	err := s.db.QueryRow(query, token).Scan(
		&sess.ID,
		&sess.AnonID,
		&sess.IssuedAt,
		&sess.ExpiresAt,
		&sess.Token,
		&sess.CreatedAt,
		&sess.LastActivityAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	return sess, nil
}

func (s *PgStore) GetSessionsByAnonID(anonID string) ([]*SessionInfo, error) {
	query := `
		SELECT id, anon_id, issued_at, expires_at, token, created_at, COALESCE(last_activity_at, issued_at)
		FROM sessions 
		WHERE anon_id = $1
		ORDER BY last_activity_at DESC
	`
	rows, err := s.db.Query(query, anonID)
	if err != nil {
		return nil, fmt.Errorf("get sessions by anon id: %w", err)
	}
	defer rows.Close()

	sessions := make([]*SessionInfo, 0)
	for rows.Next() {
		sess := &SessionInfo{}
		if err := rows.Scan(&sess.ID, &sess.AnonID, &sess.IssuedAt, &sess.ExpiresAt, &sess.Token, &sess.CreatedAt, &sess.LastActivityAt); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, sess)
	}

	return sessions, nil
}

func (s *PgStore) RevokeSession(token string) error {
	query := `DELETE FROM sessions WHERE token = $1`
	result, err := s.db.Exec(query, token)
	if err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}

	count, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("get rows affected: %w", err)
	}

	if count == 0 {
		return fmt.Errorf("session not found")
	}

	return nil
}

func (s *PgStore) RevokeAllSessionsForUser(anonID string) (int, error) {
	query := `DELETE FROM sessions WHERE anon_id = $1`
	result, err := s.db.Exec(query, anonID)
	if err != nil {
		return 0, fmt.Errorf("revoke all sessions: %w", err)
	}

	count, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("get rows affected: %w", err)
	}

	return int(count), nil
}

func (s *PgStore) EnforceSessionLimit(anonID string, maxSessions int) error {
	// Delete oldest sessions beyond the limit
	query := `
		DELETE FROM sessions 
		WHERE token IN (
			SELECT token FROM sessions 
			WHERE anon_id = $1
			ORDER BY COALESCE(last_activity_at, issued_at) ASC
			OFFSET $2
		)
	`
	_, err := s.db.Exec(query, anonID, maxSessions)
	if err != nil {
		return fmt.Errorf("enforce session limit: %w", err)
	}

	return nil
}

func (s *PgStore) LogAuditEvent(event AuditLog) {
	if event.ID == "" {
		event.ID = fmt.Sprintf("audit_%d", time.Now().UnixNano())
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	query := `INSERT INTO audit_logs (id, action, anon_id, details, timestamp) VALUES ($1, $2, $3, $4, $5)`
	_, err := s.db.Exec(query, event.ID, event.Action, event.AnonID, event.Details, event.Timestamp)
	if err != nil {
		fmt.Printf("error logging audit event: %v\n", err)
	}
}

// GetPost retrieves a post by ID
func (s *PgStore) GetPost(postID string) (*Post, bool) {
	query := `SELECT id, anon_id, text, created_at, likes, dislikes, deleted FROM posts WHERE id = $1`
	row := s.db.QueryRow(query, postID)

	p := &Post{}
	err := row.Scan(&p.ID, &p.AnonID, &p.Text, &p.CreatedAt, &p.Likes, &p.Dislikes, &p.Deleted)
	if err == sql.ErrNoRows {
		return nil, false
	}
	if err != nil {
		fmt.Printf("error getting post: %v\n", err)
		return nil, false
	}
	return p, true
}

// SearchPosts performs a comprehensive search across posts with ranking
// Supports keyword search, hashtag filtering, typo tolerance, and mixed queries
func (s *PgStore) SearchPosts(query string, hashtags []string, limit int, offset int) ([]*PostSearchResult, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var results []*PostSearchResult
	var totalCount int

	// Build the base query with ranking
	// We'll use multiple ranking strategies and combine them
	baseQuery := `
		WITH ranked_posts AS (
			SELECT 
				id, anon_id, text, created_at, likes, dislikes, deleted,
				hashtags,
				CASE 
					-- Strategy 1: Full-text search relevance (highest priority)
					WHEN $1 != '' THEN 
						ts_rank(text_search, plainto_tsquery('english', $1)) * 10.0
					ELSE 0
				END +
				CASE
					-- Strategy 2: Exact match bonus
					WHEN $1 != '' AND LOWER(text) LIKE '%' || LOWER($1) || '%' THEN 5.0
					ELSE 0
				END +
				CASE
					-- Strategy 3: Prefix match bonus
					WHEN $1 != '' AND LOWER(text) LIKE LOWER($1) || '%' THEN 3.0
					ELSE 0
				END +
				CASE
					-- Strategy 4: Fuzzy similarity (typo tolerance)
					WHEN $1 != '' THEN 
						similarity(LOWER(text), LOWER($1)) * 2.0
					ELSE 0
				END +
				CASE
					-- Strategy 5: Small recency boost (recent posts get slight advantage)
					WHEN created_at > NOW() - INTERVAL '7 days' THEN 0.5
					WHEN created_at > NOW() - INTERVAL '30 days' THEN 0.2
					ELSE 0
				END AS relevance_score
			FROM posts
			WHERE deleted = false
	`

	// Add hashtag filtering if hashtags are provided
	args := []interface{}{query}
	argIdx := 2
	if len(hashtags) > 0 {
		baseQuery += fmt.Sprintf(" AND hashtags @> $%d", argIdx)
		args = append(args, hashtags)
		argIdx++
	}

	// Add keyword filter (must match if query is provided)
	if query != "" {
		baseQuery += fmt.Sprintf(` AND (
			text_search @@ plainto_tsquery('english', $%d)
			OR LOWER(text) LIKE '%%' || LOWER($%d) || '%%'
			OR similarity(LOWER(text), LOWER($%d)) > 0.1
		)`, argIdx, argIdx, argIdx)
		args = append(args, query)
		argIdx++
	}

	// Complete the CTE
	baseQuery += `
		)`

	// Get total count
	countQuery := baseQuery + `
		SELECT COUNT(*) FROM ranked_posts WHERE relevance_score > 0
	`
	err := s.db.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil && err != sql.ErrNoRows {
		return nil, 0, fmt.Errorf("count search results: %w", err)
	}

	// Complete the main query with ordering, pagination
	mainQuery := baseQuery + `
		SELECT 
			id, anon_id, text, created_at, likes, dislikes, deleted,
			hashtags, relevance_score
		FROM ranked_posts
		WHERE relevance_score > 0
		ORDER BY relevance_score DESC, created_at DESC
		LIMIT $` + fmt.Sprintf("%d", argIdx) + ` OFFSET $` + fmt.Sprintf("%d", argIdx+1)

	args = append(args, limit, offset)

	rows, err := s.db.Query(mainQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("search posts: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		result := &PostSearchResult{
			Post: &Post{},
		}
		var hashtagsArray []string
		var hashtagsRaw sql.NullString

		err := rows.Scan(
			&result.Post.ID,
			&result.Post.AnonID,
			&result.Post.Text,
			&result.Post.CreatedAt,
			&result.Post.Likes,
			&result.Post.Dislikes,
			&result.Post.Deleted,
			&hashtagsRaw,
			&result.RelevanceScore,
		)
		if err != nil {
			fmt.Printf("error scanning search result: %v\n", err)
			continue
		}

		// Parse hashtags array from postgres
		if hashtagsRaw.Valid {
			// PostgreSQL array comes as {tag1,tag2,tag3}
			hashtagsStr := hashtagsRaw.String
			if len(hashtagsStr) > 2 {
				hashtagsStr = hashtagsStr[1 : len(hashtagsStr)-1] // remove { }
				if hashtagsStr != "" {
					for _, tag := range parsePostgresArray(hashtagsStr) {
						hashtagsArray = append(hashtagsArray, tag)
					}
				}
			}
		}

		// Extract matched terms for highlighting
		result.MatchedTerms = extractMatchedTerms(query, hashtagsArray)
		result.Highlights = generateHighlights(result.Post.Text, query, 100)

		results = append(results, result)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate search results: %w", err)
	}

	return results, totalCount, nil
}

// Helper function to parse PostgreSQL array format
func parsePostgresArray(s string) []string {
	if s == "" {
		return []string{}
	}
	// Simple split - for production, consider using a proper parser
	parts := []string{}
	for _, part := range splitPostgresArray(s) {
		if part != "" {
			parts = append(parts, part)
		}
	}
	return parts
}

func splitPostgresArray(s string) []string {
	// Handle quoted and unquoted elements
	var result []string
	var current []rune
	inQuote := false

	for i, r := range s {
		if r == '"' {
			inQuote = !inQuote
		} else if r == ',' && !inQuote {
			if len(current) > 0 {
				result = append(result, string(current))
				current = []rune{}
			}
		} else {
			current = append(current, r)
		}

		// Add last element
		if i == len(s)-1 && len(current) > 0 {
			result = append(result, string(current))
		}
	}

	return result
}

// Extract terms that matched from the query
func extractMatchedTerms(query string, hashtags []string) []string {
	terms := []string{}
	if query != "" {
		terms = append(terms, query)
	}
	terms = append(terms, hashtags...)
	return terms
}

// Generate highlighted snippet of text
func generateHighlights(text string, query string, maxLen int) string {
	if query == "" || len(text) <= maxLen {
		if len(text) > maxLen {
			return text[:maxLen] + "..."
		}
		return text
	}

	// Simple highlighting: return snippet around the match
	if len(text) > maxLen {
		return text[:maxLen] + "..."
	}
	return text
}

// DeletePostByUser marks a post as deleted if the user is the author
func (s *PgStore) DeletePostByUser(postID, anonID string) error {
	query := `UPDATE posts SET deleted = true WHERE id = $1 AND anon_id = $2 AND deleted = false`
	result, err := s.db.Exec(query, postID, anonID)
	if err != nil {
		return fmt.Errorf("delete post: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("check rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("unauthorized: not post author or post not found")
	}

	return nil
}

// ReactToPost adds or updates a user's reaction to a post
func (s *PgStore) ReactToPost(postID, anonID, reactionType string) error {
	// Start transaction
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Check if post exists and is not deleted
	var deleted bool
	err = tx.QueryRow(`SELECT deleted FROM posts WHERE id = $1`, postID).Scan(&deleted)
	if err == sql.ErrNoRows {
		return fmt.Errorf("post not found")
	}
	if err != nil {
		return fmt.Errorf("check post: %w", err)
	}
	if deleted {
		return fmt.Errorf("post is deleted")
	}

	// Get existing reaction
	var existingReaction sql.NullString
	err = tx.QueryRow(`SELECT reaction_type FROM post_reactions WHERE post_id = $1 AND anon_id = $2`,
		postID, anonID).Scan(&existingReaction)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("get existing reaction: %w", err)
	}

	// If same reaction, remove it (toggle off)
	if existingReaction.Valid && existingReaction.String == reactionType {
		_, err = tx.Exec(`DELETE FROM post_reactions WHERE post_id = $1 AND anon_id = $2`, postID, anonID)
		if err != nil {
			return fmt.Errorf("remove reaction: %w", err)
		}

		// Decrement counter
		if reactionType == "like" {
			_, err = tx.Exec(`UPDATE posts SET likes = likes - 1 WHERE id = $1`, postID)
		} else if reactionType == "dislike" {
			_, err = tx.Exec(`UPDATE posts SET dislikes = dislikes - 1 WHERE id = $1`, postID)
		}
		if err != nil {
			return fmt.Errorf("decrement counter: %w", err)
		}

		return tx.Commit()
	}

	// If different reaction exists, update counters
	if existingReaction.Valid {
		if existingReaction.String == "like" {
			_, err = tx.Exec(`UPDATE posts SET likes = likes - 1 WHERE id = $1`, postID)
		} else if existingReaction.String == "dislike" {
			_, err = tx.Exec(`UPDATE posts SET dislikes = dislikes - 1 WHERE id = $1`, postID)
		}
		if err != nil {
			return fmt.Errorf("decrement old counter: %w", err)
		}
	}

	// Add/update reaction
	_, err = tx.Exec(`
		INSERT INTO post_reactions (post_id, anon_id, reaction_type, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (post_id, anon_id) DO UPDATE SET reaction_type = $3, created_at = $4
	`, postID, anonID, reactionType, time.Now())
	if err != nil {
		return fmt.Errorf("insert reaction: %w", err)
	}

	// Increment new counter
	if reactionType == "like" {
		_, err = tx.Exec(`UPDATE posts SET likes = likes + 1 WHERE id = $1`, postID)
	} else if reactionType == "dislike" {
		_, err = tx.Exec(`UPDATE posts SET dislikes = dislikes + 1 WHERE id = $1`, postID)
	}
	if err != nil {
		return fmt.Errorf("increment counter: %w", err)
	}

	return tx.Commit()
}

// GetPostReaction retrieves a user's reaction to a post
func (s *PgStore) GetPostReaction(postID, anonID string) (string, bool) {
	var reactionType string
	err := s.db.QueryRow(`SELECT reaction_type FROM post_reactions WHERE post_id = $1 AND anon_id = $2`,
		postID, anonID).Scan(&reactionType)
	if err == sql.ErrNoRows {
		return "", false
	}
	if err != nil {
		fmt.Printf("error getting reaction: %v\n", err)
		return "", false
	}
	return reactionType, true
}

// AddComment adds a comment to a post
func (s *PgStore) AddComment(comment *PostComment) error {
	query := `INSERT INTO post_comments (id, post_id, anon_id, text, created_at, likes, dislikes, deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
	_, err := s.db.Exec(query, comment.ID, comment.PostID, comment.AnonID, comment.Text, comment.CreatedAt, comment.Likes, comment.Dislikes, comment.Deleted)
	if err != nil {
		return fmt.Errorf("add comment: %w", err)
	}
	return nil
}

// GetComments retrieves all non-deleted comments for a post
func (s *PgStore) GetComments(postID string) []*PostComment {
	query := `SELECT id, post_id, anon_id, text, created_at, likes, dislikes, deleted FROM post_comments WHERE post_id = $1 AND deleted = false ORDER BY created_at ASC`
	rows, err := s.db.Query(query, postID)
	if err != nil {
		fmt.Printf("error querying comments: %v\n", err)
		return []*PostComment{}
	}
	defer rows.Close()

	comments := make([]*PostComment, 0)
	for rows.Next() {
		c := &PostComment{}
		if err := rows.Scan(&c.ID, &c.PostID, &c.AnonID, &c.Text, &c.CreatedAt, &c.Likes, &c.Dislikes, &c.Deleted); err != nil {
			fmt.Printf("error scanning comment: %v\n", err)
			continue
		}
		comments = append(comments, c)
	}

	return comments
}

// GetComment retrieves a comment by ID
func (s *PgStore) GetComment(commentID string) (*PostComment, bool) {
	query := `SELECT id, post_id, anon_id, text, created_at, likes, dislikes, deleted FROM post_comments WHERE id = $1`
	row := s.db.QueryRow(query, commentID)

	comment := &PostComment{}
	if err := row.Scan(&comment.ID, &comment.PostID, &comment.AnonID, &comment.Text, &comment.CreatedAt, &comment.Likes, &comment.Dislikes, &comment.Deleted); err != nil {
		if err == sql.ErrNoRows {
			return nil, false
		}
		fmt.Printf("error getting comment: %v\n", err)
		return nil, false
	}

	return comment, true
}

// DeleteCommentByUser soft-deletes a comment if user is the author
func (s *PgStore) DeleteCommentByUser(commentID, anonID string) error {
	query := `UPDATE post_comments SET deleted = true WHERE id = $1 AND anon_id = $2 AND deleted = false`
	result, err := s.db.Exec(query, commentID, anonID)
	if err != nil {
		return fmt.Errorf("delete comment: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("check rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("unauthorized: not comment author or comment not found")
	}

	return nil
}

// ReactToComment adds or updates a user's reaction to a comment
func (s *PgStore) ReactToComment(commentID, anonID, reactionType string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	var deleted bool
	err = tx.QueryRow(`SELECT deleted FROM post_comments WHERE id = $1`, commentID).Scan(&deleted)
	if err == sql.ErrNoRows {
		return fmt.Errorf("comment not found")
	}
	if err != nil {
		return fmt.Errorf("check comment: %w", err)
	}
	if deleted {
		return fmt.Errorf("comment is deleted")
	}

	var existingReaction sql.NullString
	err = tx.QueryRow(`SELECT reaction_type FROM comment_reactions WHERE comment_id = $1 AND anon_id = $2`,
		commentID, anonID).Scan(&existingReaction)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("get existing reaction: %w", err)
	}

	if existingReaction.Valid && existingReaction.String == reactionType {
		_, err = tx.Exec(`DELETE FROM comment_reactions WHERE comment_id = $1 AND anon_id = $2`, commentID, anonID)
		if err != nil {
			return fmt.Errorf("remove reaction: %w", err)
		}

		if reactionType == "like" {
			_, err = tx.Exec(`UPDATE post_comments SET likes = likes - 1 WHERE id = $1`, commentID)
		} else if reactionType == "dislike" {
			_, err = tx.Exec(`UPDATE post_comments SET dislikes = dislikes - 1 WHERE id = $1`, commentID)
		}
		if err != nil {
			return fmt.Errorf("decrement counter: %w", err)
		}

		return tx.Commit()
	}

	if existingReaction.Valid {
		if existingReaction.String == "like" {
			_, err = tx.Exec(`UPDATE post_comments SET likes = likes - 1 WHERE id = $1`, commentID)
		} else if existingReaction.String == "dislike" {
			_, err = tx.Exec(`UPDATE post_comments SET dislikes = dislikes - 1 WHERE id = $1`, commentID)
		}
		if err != nil {
			return fmt.Errorf("decrement old counter: %w", err)
		}
	}

	_, err = tx.Exec(`
		INSERT INTO comment_reactions (comment_id, anon_id, reaction_type, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (comment_id, anon_id) DO UPDATE SET reaction_type = $3, created_at = $4
	`, commentID, anonID, reactionType, time.Now())
	if err != nil {
		return fmt.Errorf("insert reaction: %w", err)
	}

	if reactionType == "like" {
		_, err = tx.Exec(`UPDATE post_comments SET likes = likes + 1 WHERE id = $1`, commentID)
	} else if reactionType == "dislike" {
		_, err = tx.Exec(`UPDATE post_comments SET dislikes = dislikes + 1 WHERE id = $1`, commentID)
	}
	if err != nil {
		return fmt.Errorf("increment counter: %w", err)
	}

	return tx.Commit()
}

// GetCommentReaction retrieves a user's reaction to a comment
func (s *PgStore) GetCommentReaction(commentID, anonID string) (string, bool) {
	var reactionType string
	err := s.db.QueryRow(`SELECT reaction_type FROM comment_reactions WHERE comment_id = $1 AND anon_id = $2`,
		commentID, anonID).Scan(&reactionType)
	if err == sql.ErrNoRows {
		return "", false
	}
	if err != nil {
		fmt.Printf("error getting comment reaction: %v\n", err)
		return "", false
	}
	return reactionType, true
}

// AddCommentReply adds a reply to a comment
func (s *PgStore) AddCommentReply(reply *CommentReply) error {
	query := `INSERT INTO comment_replies (id, comment_id, anon_id, text, created_at, deleted) VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := s.db.Exec(query, reply.ID, reply.CommentID, reply.AnonID, reply.Text, reply.CreatedAt, reply.Deleted)
	if err != nil {
		return fmt.Errorf("add comment reply: %w", err)
	}
	return nil
}

// GetCommentReplies retrieves all non-deleted replies for a comment
func (s *PgStore) GetCommentReplies(commentID string) []*CommentReply {
	query := `SELECT id, comment_id, anon_id, text, created_at, deleted FROM comment_replies WHERE comment_id = $1 AND deleted = false ORDER BY created_at ASC`
	rows, err := s.db.Query(query, commentID)
	if err != nil {
		fmt.Printf("error querying comment replies: %v\n", err)
		return []*CommentReply{}
	}
	defer rows.Close()

	replies := make([]*CommentReply, 0)
	for rows.Next() {
		r := &CommentReply{}
		if err := rows.Scan(&r.ID, &r.CommentID, &r.AnonID, &r.Text, &r.CreatedAt, &r.Deleted); err != nil {
			fmt.Printf("error scanning comment reply: %v\n", err)
			continue
		}
		replies = append(replies, r)
	}

	return replies
}

// DeleteCommentReplyByUser soft-deletes a reply if user is the author
func (s *PgStore) DeleteCommentReplyByUser(replyID, anonID string) error {
	query := `UPDATE comment_replies SET deleted = true WHERE id = $1 AND anon_id = $2 AND deleted = false`
	result, err := s.db.Exec(query, replyID, anonID)
	if err != nil {
		return fmt.Errorf("delete comment reply: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("check rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("unauthorized: not reply author or reply not found")
	}

	return nil
}

// GetCommentRepliesCount returns count of non-deleted replies for a comment
func (s *PgStore) GetCommentRepliesCount(commentID string) int {
	var count int
	query := `SELECT COUNT(*) FROM comment_replies WHERE comment_id = $1 AND deleted = false`
	err := s.db.QueryRow(query, commentID).Scan(&count)
	if err != nil {
		fmt.Printf("error counting comment replies: %v\n", err)
		return 0
	}
	return count
}

// GetCommentsCount returns count of non-deleted comments for a post
func (s *PgStore) GetCommentsCount(postID string) int {
	var count int
	query := `SELECT COUNT(*) FROM post_comments WHERE post_id = $1 AND deleted = false`
	err := s.db.QueryRow(query, postID).Scan(&count)
	if err != nil {
		fmt.Printf("error counting comments: %v\n", err)
		return 0
	}
	return count
}
