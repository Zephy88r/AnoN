package store

import (
	"sync"
	"time"
)

type LinkCardStatus string

const (
	CardActive  LinkCardStatus = "active"
	CardUsed    LinkCardStatus = "used"
	CardRevoked LinkCardStatus = "revoked"
	CardExpired LinkCardStatus = "expired"
)

type TrustStatus string

const (
	TrustPending  TrustStatus = "pending"
	TrustAccepted TrustStatus = "accepted"
	TrustDeclined TrustStatus = "declined"
)

type LinkCard struct {
	Code      string
	OwnerAnon string
	Status    LinkCardStatus
	CreatedAt time.Time
	ExpiresAt time.Time
	UsedBy    string // requester anon if used
}

type TrustRequest struct {
	ID        string
	Code      string
	FromAnon  string
	ToAnon    string
	Status    TrustStatus
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Post struct {
	ID        string
	AnonID    string
	Text      string
	CreatedAt time.Time
}

type GeoPing struct {
	AnonID    string
	Lat       float64
	Lng       float64
	Timestamp time.Time
}

type MemStore struct {
	mu        sync.RWMutex
	cards     map[string]*LinkCard      // code -> card
	trust     map[string]*TrustRequest  // id -> trust req
	posts     []*Post                   // all posts, newest first
	pings     map[string]*GeoPing       // anon -> last ping
	postDays  map[string]map[string]int // anon -> date (YYYY-MM-DD) -> count
	auditLogs []AuditLog                // all audit logs
	sessions  map[string]*SessionInfo   // token -> session
}

func NewMemStore() *MemStore {
	return &MemStore{
		cards:     make(map[string]*LinkCard),
		trust:     make(map[string]*TrustRequest),
		posts:     make([]*Post, 0),
		pings:     make(map[string]*GeoPing),
		postDays:  make(map[string]map[string]int),
		auditLogs: make([]AuditLog, 0),
		sessions:  make(map[string]*SessionInfo),
	}
}

func (s *MemStore) PutCard(c *LinkCard) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cards[c.Code] = c
}

func (s *MemStore) GetCard(code string) (*LinkCard, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.cards[code]
	return c, ok
}

func (s *MemStore) CardsByOwner(owner string) []*LinkCard {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*LinkCard{}
	for _, c := range s.cards {
		if c.OwnerAnon == owner {
			out = append(out, c)
		}
	}
	return out
}

func (s *MemStore) PutTrust(t *TrustRequest) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.trust[t.ID] = t
}

func (s *MemStore) GetTrust(id string) (*TrustRequest, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t, ok := s.trust[id]
	return t, ok
}

func (s *MemStore) TrustForAnon(anon string) []*TrustRequest {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*TrustRequest{}
	for _, t := range s.trust {
		if t.FromAnon == anon || t.ToAnon == anon {
			out = append(out, t)
		}
	}
	return out
}

// Compile-time check that MemStore implements Store interface
var _ Store = (*MemStore)(nil)

// PutPost adds a post and maintains newest-first order.
func (s *MemStore) PutPost(p *Post) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.posts = append([]*Post{p}, s.posts...)
}

// GetFeed returns up to limit posts, newest first.
func (s *MemStore) GetFeed(limit int) []*Post {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if limit <= 0 || limit > len(s.posts) {
		limit = len(s.posts)
	}
	out := make([]*Post, limit)
	copy(out, s.posts[:limit])
	return out
}

// CanCreatePost checks daily post limit (3 per day). Returns false if limit reached.
// Increments counter if allowed.
func (s *MemStore) CanCreatePost(anonID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	dateKey := time.Now().Format("2006-01-02")

	// Initialize anon's day map if needed
	if _, exists := s.postDays[anonID]; !exists {
		s.postDays[anonID] = make(map[string]int)
	}

	count := s.postDays[anonID][dateKey]
	if count >= 3 {
		return false
	}

	s.postDays[anonID][dateKey] = count + 1
	return true
}

// PutGeo stores the last ping for an anon.
func (s *MemStore) PutGeo(ping *GeoPing) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pings[ping.AnonID] = ping
}

// GetNearby returns all pings within the radius and recent (last 10 minutes).
// Uses haversine distance calculation.
func (s *MemStore) GetNearby(lat, lng float64, radiusKm float64) []*GeoPing {
	s.mu.RLock()
	defer s.mu.RUnlock()

	cutoff := time.Now().Add(-10 * time.Minute)
	out := make([]*GeoPing, 0)

	for _, ping := range s.pings {
		// Skip old pings
		if ping.Timestamp.Before(cutoff) {
			continue
		}

		// Calculate distance using haversine
		dist := haversineDistance(lat, lng, ping.Lat, ping.Lng)
		if dist <= radiusKm {
			out = append(out, ping)
		}

		// Limit to 100 results
		if len(out) >= 100 {
			break
		}
	}

	return out
}

// haversineDistance calculates distance in km between two lat/lng points.
func haversineDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const earthKm = 6371.0
	const pi = 3.14159265358979323846
	const degToRad = pi / 180.0

	dLat := (lat2 - lat1) * degToRad
	dLng := (lng2 - lng1) * degToRad

	lat1R := lat1 * degToRad
	lat2R := lat2 * degToRad

	a := sin2(dLat/2) + cos(lat1R)*cos(lat2R)*sin2(dLng/2)
	c := 2 * asin(sqrt(a))

	return earthKm * c
}

// sin, cos, sqrt, asin helpers for haversine
func sin(x float64) float64 {
	return sinTaylor(x)
}

func cos(x float64) float64 {
	return cosTaylor(x)
}

func sqrt(x float64) float64 {
	if x == 0 {
		return 0
	}
	z := x
	for i := 0; i < 10; i++ {
		z = (z + x/z) / 2
	}
	return z
}

func asin(x float64) float64 {
	if x < 0 {
		return -asin(-x)
	}
	if x > 1 {
		x = 1
	}
	return atan(x / sqrt(1-x*x))
}

func atan(x float64) float64 {
	return atanTaylor(x)
}

func sin2(x float64) float64 {
	s := sin(x)
	return s * s
}

// Taylor series approximations for trig functions (simple, sufficient for haversine)
func sinTaylor(x float64) float64 {
	x = normalizeAngle(x)
	result := x
	term := x
	for i := 1; i < 20; i++ {
		term *= -x * x / (float64((2 * i) * (2*i + 1)))
		result += term
	}
	return result
}

func cosTaylor(x float64) float64 {
	x = normalizeAngle(x)
	result := 1.0
	term := 1.0
	for i := 1; i < 20; i++ {
		term *= -x * x / (float64((2*i - 1) * (2 * i)))
		result += term
	}
	return result
}

func atanTaylor(x float64) float64 {
	if x > 1 {
		return 1.5707963267948966 - atanTaylor(1/x)
	}
	if x < -1 {
		return -1.5707963267948966 - atanTaylor(1/x)
	}
	result := x
	term := x
	x2 := x * x
	for i := 1; i < 20; i++ {
		term *= -x2 * float64(2*i-1) / float64(2*i+1)
		result += term
	}
	return result
}

func normalizeAngle(x float64) float64 {
	const pi = 3.14159265358979323846
	const twoPi = 2 * pi
	for x > pi {
		x -= twoPi
	}
	for x < -pi {
		x += twoPi
	}
	return x
}

// Default is the global in-memory store for dev.
// Later we'll replace this with a DB-backed store.

// TrustAccepted returns true if there exists an accepted trust between a and b (either direction).
func (s *MemStore) TrustAccepted(a, b string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, t := range s.trust {
		if t.Status != TrustAccepted {
			continue
		}
		if (t.FromAnon == a && t.ToAnon == b) || (t.FromAnon == b && t.ToAnon == a) {
			return true
		}
	}
	return false
}

// Admin methods
func (s *MemStore) GetAllUsers() []*UserInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	userMap := make(map[string]*UserInfo)
	for _, p := range s.posts {
		if _, ok := userMap[p.AnonID]; !ok {
			userMap[p.AnonID] = &UserInfo{AnonID: p.AnonID, CreatedAt: p.CreatedAt}
		}
		userMap[p.AnonID].PostCount++
	}

	users := make([]*UserInfo, 0, len(userMap))
	for _, u := range userMap {
		users = append(users, u)
	}
	return users
}

func (s *MemStore) GetAllSessions() []*SessionInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sessions := make([]*SessionInfo, 0, len(s.sessions))
	for _, sess := range s.sessions {
		sessions = append(sessions, sess)
	}
	return sessions
}

func (s *MemStore) PutSession(session SessionInfo) {
	s.mu.Lock()
	defer s.mu.Unlock()

	copy := session
	s.sessions[session.Token] = &copy
}

func (s *MemStore) GetAllTrustRequests() []*TrustRequest {
	s.mu.RLock()
	defer s.mu.RUnlock()

	requests := make([]*TrustRequest, 0, len(s.trust))
	for _, req := range s.trust {
		requests = append(requests, req)
	}
	return requests
}

func (s *MemStore) GetAuditLogs() []AuditLog {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.auditLogs
}

func (s *MemStore) DeletePost(postID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, p := range s.posts {
		if p.ID == postID {
			s.posts = append(s.posts[:i], s.posts[i+1:]...)
			return nil
		}
	}
	return nil
}

func (s *MemStore) LogAuditEvent(event AuditLog) {
	s.mu.Lock()
	defer s.mu.Unlock()
	event.Timestamp = time.Now()
	s.auditLogs = append(s.auditLogs, event)
}
