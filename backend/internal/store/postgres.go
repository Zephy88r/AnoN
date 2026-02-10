package store

import (
	"database/sql"
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

func (s *PgStore) PutCard(c *LinkCard) {
	query := `
		INSERT INTO link_cards (code, owner_anon, status, created_at, expires_at, used_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (code) DO UPDATE SET
			status = $3, used_by = $6, updated_at = CURRENT_TIMESTAMP
	`
	_, err := s.db.Exec(query, c.Code, c.OwnerAnon, c.Status, c.CreatedAt, c.ExpiresAt, c.UsedBy)
	if err != nil {
		fmt.Printf("error putting card: %v\n", err)
	}
}

func (s *PgStore) GetCard(code string) (*LinkCard, bool) {
	query := `SELECT code, owner_anon, status, created_at, expires_at, used_by FROM link_cards WHERE code = $1`
	row := s.db.QueryRow(query, code)

	card := &LinkCard{}
	err := row.Scan(&card.Code, &card.OwnerAnon, &card.Status, &card.CreatedAt, &card.ExpiresAt, &card.UsedBy)
	if err == sql.ErrNoRows {
		return nil, false
	}
	if err != nil {
		fmt.Printf("error getting card: %v\n", err)
		return nil, false
	}
	return card, true
}

func (s *PgStore) CardsByOwner(owner string) []*LinkCard {
	query := `SELECT code, owner_anon, status, created_at, expires_at, used_by FROM link_cards WHERE owner_anon = $1 ORDER BY created_at DESC`
	rows, err := s.db.Query(query, owner)
	if err != nil {
		fmt.Printf("error querying cards: %v\n", err)
		return []*LinkCard{}
	}
	defer rows.Close()

	out := []*LinkCard{}
	for rows.Next() {
		card := &LinkCard{}
		if err := rows.Scan(&card.Code, &card.OwnerAnon, &card.Status, &card.CreatedAt, &card.ExpiresAt, &card.UsedBy); err != nil {
			fmt.Printf("error scanning card: %v\n", err)
			continue
		}
		out = append(out, card)
	}
	return out
}

// ===== TRUST REQUESTS =====

func (s *PgStore) PutTrust(t *TrustRequest) {
	query := `
		INSERT INTO trust_requests (id, code, from_anon, to_anon, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) DO UPDATE SET
			status = $5, updated_at = $7
	`
	_, err := s.db.Exec(query, t.ID, t.Code, t.FromAnon, t.ToAnon, t.Status, t.CreatedAt, t.UpdatedAt)
	if err != nil {
		fmt.Printf("error putting trust: %v\n", err)
	}
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
	query := `INSERT INTO posts (id, anon_id, text, created_at) VALUES ($1, $2, $3, $4)`
	_, err := s.db.Exec(query, p.ID, p.AnonID, p.Text, p.CreatedAt)
	if err != nil {
		fmt.Printf("error putting post: %v\n", err)
	}
}

func (s *PgStore) GetFeed(limit int) []*Post {
	if limit <= 0 {
		limit = 50 // sensible default
	}
	query := `SELECT id, anon_id, text, created_at FROM posts ORDER BY created_at DESC LIMIT $1`
	rows, err := s.db.Query(query, limit)
	if err != nil {
		fmt.Printf("error querying posts: %v\n", err)
		return []*Post{}
	}
	defer rows.Close()

	out := []*Post{}
	for rows.Next() {
		p := &Post{}
		if err := rows.Scan(&p.ID, &p.AnonID, &p.Text, &p.CreatedAt); err != nil {
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
	query := `SELECT anon_id, token, expires_at, created_at FROM sessions ORDER BY created_at DESC`

	rows, err := s.db.Query(query)
	if err != nil {
		fmt.Printf("error querying sessions: %v\n", err)
		return []*SessionInfo{}
	}
	defer rows.Close()

	out := []*SessionInfo{}
	for rows.Next() {
		s := &SessionInfo{}
		if err := rows.Scan(&s.AnonID, &s.Token, &s.ExpiresAt, &s.CreatedAt); err != nil {
			fmt.Printf("error scanning session: %v\n", err)
			continue
		}
		out = append(out, s)
	}
	return out
}

func (s *PgStore) PutSession(session SessionInfo) {
	query := `
		INSERT INTO sessions (token, anon_id, created_at, expires_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (token) DO UPDATE SET
			expires_at = $4
	`
	_, err := s.db.Exec(query, session.Token, session.AnonID, session.CreatedAt, session.ExpiresAt)
	if err != nil {
		fmt.Printf("error putting session: %v\n", err)
	}
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
