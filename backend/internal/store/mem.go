package store

import (
	"fmt"
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
	ID        string
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
	Likes     int
	Dislikes  int
	Deleted   bool
}

type PostReaction struct {
	PostID       string
	AnonID       string
	ReactionType string // "like" or "dislike"
	CreatedAt    time.Time
}

type PostComment struct {
	ID        string
	PostID    string
	AnonID    string
	Text      string
	CreatedAt time.Time
	Likes     int
	Dislikes  int
	Deleted   bool
}

type CommentReaction struct {
	CommentID    string
	AnonID       string
	ReactionType string // "like" or "dislike"
	CreatedAt    time.Time
}

type CommentReply struct {
	ID        string
	CommentID string
	AnonID    string
	Text      string
	CreatedAt time.Time
	Deleted   bool
	Likes     int
	Dislikes  int
}

type ReplyReaction struct {
	ReplyID      string
	AnonID       string
	ReactionType string // "like" or "dislike"
	CreatedAt    time.Time
}

type GeoPing struct {
	AnonID    string
	Lat       float64
	Lng       float64
	Timestamp time.Time
}

type MemStore struct {
	mu             sync.RWMutex
	cards          map[string]*LinkCard                   // code -> card
	trust          map[string]*TrustRequest               // id -> trust req
	posts          []*Post                                // all posts, newest first
	pings          map[string]*GeoPing                    // anon -> last ping
	postDays       map[string]map[string]int              // anon -> date (YYYY-MM-DD) -> count
	auditLogs      []AuditLog                             // all audit logs
	sessions       map[string]*SessionInfo                // token -> session
	postReactions  map[string]map[string]*PostReaction    // postID -> anonID -> reaction
	postComments   map[string][]*PostComment              // postID -> comments
	commentReacts  map[string]map[string]*CommentReaction // commentID -> anonID -> reaction
	commentReplies map[string][]*CommentReply             // commentID -> replies
	replyReacts    map[string]map[string]*ReplyReaction   // replyID -> anonID -> reaction
	devices        map[string]*Device                     // device_public_id -> device
	deviceNonces   map[string]map[string]*DeviceNonce     // device_public_id -> nonce -> device nonce
}

func NewMemStore() *MemStore {
	return &MemStore{
		cards:          make(map[string]*LinkCard),
		trust:          make(map[string]*TrustRequest),
		posts:          make([]*Post, 0),
		pings:          make(map[string]*GeoPing),
		postDays:       make(map[string]map[string]int),
		auditLogs:      make([]AuditLog, 0),
		sessions:       make(map[string]*SessionInfo),
		postReactions:  make(map[string]map[string]*PostReaction),
		postComments:   make(map[string][]*PostComment),
		commentReacts:  make(map[string]map[string]*CommentReaction),
		commentReplies: make(map[string][]*CommentReply),
		replyReacts:    make(map[string]map[string]*ReplyReaction),
		devices:        make(map[string]*Device),
		deviceNonces:   make(map[string]map[string]*DeviceNonce),
	}
}

func (s *MemStore) PutCard(c *LinkCard) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cards[c.Code] = c
	return nil
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

func (s *MemStore) PutTrust(t *TrustRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.trust[t.ID] = t
	return nil
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

// GetFeed returns up to limit posts, newest first, excluding deleted posts.
func (s *MemStore) GetFeed(limit int) []*Post {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]*Post, 0, limit)
	for _, p := range s.posts {
		if !p.Deleted {
			out = append(out, p)
			if len(out) >= limit {
				break
			}
		}
	}
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

func (s *MemStore) GetRemainingPosts(anonID string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dateKey := time.Now().Format("2006-01-02")

	if _, exists := s.postDays[anonID]; !exists {
		return 3
	}

	count := s.postDays[anonID][dateKey]
	remaining := 3 - count
	if remaining < 0 {
		return 0
	}
	return remaining
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

func (s *MemStore) PutSession(session SessionInfo) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	copy := session
	s.sessions[session.Token] = &copy
	return nil
}

func (s *MemStore) GetDevice(devicePublicID string) (*Device, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	device, ok := s.devices[devicePublicID]
	if !ok {
		return nil, fmt.Errorf("device not found")
	}
	copy := *device
	return &copy, nil
}

func (s *MemStore) GetDeviceByAnonID(anonID string) (*Device, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, device := range s.devices {
		if device.AnonID == anonID {
			copy := *device
			return &copy, nil
		}
	}
	return nil, fmt.Errorf("device not found")
}

func (s *MemStore) CreateDevice(device *Device) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.devices[device.DevicePublicID]; exists {
		return fmt.Errorf("device already exists")
	}
	for _, existing := range s.devices {
		if existing.Username == device.Username {
			return fmt.Errorf("username already exists")
		}
		if existing.AnonID == device.AnonID {
			return fmt.Errorf("anon id already exists")
		}
	}

	if device.CreatedAt.IsZero() {
		device.CreatedAt = time.Now()
	}
	if device.UpdatedAt.IsZero() {
		device.UpdatedAt = device.CreatedAt
	}

	copy := *device
	s.devices[device.DevicePublicID] = &copy
	return nil
}

func (s *MemStore) UpdateDeviceTimestamp(devicePublicID string, updatedAt time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	device, ok := s.devices[devicePublicID]
	if !ok {
		return fmt.Errorf("device not found")
	}
	device.UpdatedAt = updatedAt
	return nil
}

func (s *MemStore) CreateDeviceNonce(devicePublicID, nonce string, expiresAt time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.deviceNonces[devicePublicID]; !ok {
		s.deviceNonces[devicePublicID] = make(map[string]*DeviceNonce)
	}
	if _, exists := s.deviceNonces[devicePublicID][nonce]; exists {
		return fmt.Errorf("nonce already exists")
	}

	createdAt := time.Now()
	s.deviceNonces[devicePublicID][nonce] = &DeviceNonce{
		DevicePublicID: devicePublicID,
		Nonce:          nonce,
		ExpiresAt:      expiresAt,
		CreatedAt:      createdAt,
	}
	return nil
}

func (s *MemStore) ConsumeDeviceNonce(devicePublicID, nonce string, now time.Time) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	byDevice, ok := s.deviceNonces[devicePublicID]
	if !ok {
		return false, nil
	}
	entry, ok := byDevice[nonce]
	if !ok {
		return false, nil
	}
	if entry.UsedAt != nil {
		return false, nil
	}
	if entry.ExpiresAt.Before(now) {
		return false, nil
	}

	entry.UsedAt = &now
	return true, nil
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

// Session management methods
func (s *MemStore) UpdateSessionActivity(token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[token]
	if !ok {
		return fmt.Errorf("session not found")
	}

	sess.LastActivityAt = time.Now()
	return nil
}

func (s *MemStore) CleanupExpiredSessions() (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	count := 0

	for token, sess := range s.sessions {
		if sess.ExpiresAt.Before(now) {
			delete(s.sessions, token)
			count++
		}
	}

	return count, nil
}

func (s *MemStore) GetSessionByToken(token string) (*SessionInfo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sess, ok := s.sessions[token]
	if !ok {
		return nil, fmt.Errorf("session not found")
	}

	// Return a copy
	copy := *sess
	return &copy, nil
}

func (s *MemStore) GetSessionsByAnonID(anonID string) ([]*SessionInfo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sessions := make([]*SessionInfo, 0)
	for _, sess := range s.sessions {
		if sess.AnonID == anonID {
			copy := *sess
			sessions = append(sessions, &copy)
		}
	}

	return sessions, nil
}

func (s *MemStore) RevokeSession(token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.sessions[token]; !ok {
		return fmt.Errorf("session not found")
	}

	delete(s.sessions, token)
	return nil
}

func (s *MemStore) RevokeAllSessionsForUser(anonID string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	count := 0
	for token, sess := range s.sessions {
		if sess.AnonID == anonID {
			delete(s.sessions, token)
			count++
		}
	}

	return count, nil
}

func (s *MemStore) EnforceSessionLimit(anonID string, maxSessions int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Collect all sessions for this user
	userSessions := make([]*SessionInfo, 0)
	for _, sess := range s.sessions {
		if sess.AnonID == anonID {
			userSessions = append(userSessions, sess)
		}
	}

	// If under limit, nothing to do
	if len(userSessions) <= maxSessions {
		return nil
	}

	// Sort by LastActivityAt (oldest first)
	type sessionWithActivity struct {
		session  *SessionInfo
		activity time.Time
	}
	sessionsWithActivity := make([]sessionWithActivity, len(userSessions))
	for i, sess := range userSessions {
		activity := sess.LastActivityAt
		if activity.IsZero() {
			activity = sess.IssuedAt
		}
		sessionsWithActivity[i] = sessionWithActivity{session: sess, activity: activity}
	}

	// Simple bubble sort (fine for small n)
	for i := 0; i < len(sessionsWithActivity)-1; i++ {
		for j := 0; j < len(sessionsWithActivity)-i-1; j++ {
			if sessionsWithActivity[j].activity.After(sessionsWithActivity[j+1].activity) {
				sessionsWithActivity[j], sessionsWithActivity[j+1] = sessionsWithActivity[j+1], sessionsWithActivity[j]
			}
		}
	}

	// Remove oldest sessions until we're at the limit
	toRemove := len(userSessions) - maxSessions
	for i := 0; i < toRemove; i++ {
		delete(s.sessions, sessionsWithActivity[i].session.Token)
	}

	return nil
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

// GetPost retrieves a post by ID
func (s *MemStore) GetPost(postID string) (*Post, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, p := range s.posts {
		if p.ID == postID {
			return p, true
		}
	}
	return nil, false
}

// SearchPosts performs basic in-memory search (simplified version for MemStore)
func (s *MemStore) SearchPosts(query string, hashtags []string, limit int, offset int) ([]*PostSearchResult, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// Simple case-insensitive search
	searchLower := toLower(query)
	var results []*PostSearchResult

	for _, p := range s.posts {
		if p.Deleted {
			continue
		}

		textLower := toLower(p.Text)
		score := 0.0

		// Check hashtag match (if hashtags are provided, must match all)
		if len(hashtags) > 0 {
			postHashtags := extractHashtagsFromText(p.Text)
			if !containsAllHashtags(postHashtags, hashtags) {
				continue
			}
			score += 5.0
		}

		// Check keyword match
		if query != "" {
			if !contains(textLower, searchLower) {
				continue
			}

			// Exact match
			if textLower == searchLower {
				score += 10.0
			} else if startsWith(textLower, searchLower) {
				score += 5.0
			} else {
				score += 2.0
			}
		} else if len(hashtags) == 0 {
			// No query and no hashtags - skip
			continue
		}

		// Recency boost
		age := time.Since(p.CreatedAt)
		if age < 7*24*time.Hour {
			score += 0.5
		} else if age < 30*24*time.Hour {
			score += 0.2
		}

		results = append(results, &PostSearchResult{
			Post:           p,
			RelevanceScore: score,
			MatchedTerms:   append([]string{query}, hashtags...),
			Highlights:     truncateText(p.Text, 100),
		})
	}

	// Sort by relevance
	sortSearchResults(results)

	totalCount := len(results)

	// Apply pagination
	if offset >= len(results) {
		return []*PostSearchResult{}, totalCount, nil
	}

	end := offset + limit
	if end > len(results) {
		end = len(results)
	}

	return results[offset:end], totalCount, nil
}

// Helper functions for simple string operations
func toLower(s string) string {
	result := make([]rune, len(s))
	for i, r := range s {
		if r >= 'A' && r <= 'Z' {
			result[i] = r + 32
		} else {
			result[i] = r
		}
	}
	return string(result)
}

func contains(s, substr string) bool {
	if len(substr) > len(s) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func startsWith(s, prefix string) bool {
	if len(prefix) > len(s) {
		return false
	}
	return s[:len(prefix)] == prefix
}

func extractHashtagsFromText(text string) []string {
	var hashtags []string
	words := splitWords(text)
	for _, word := range words {
		if len(word) > 1 && word[0] == '#' {
			hashtags = append(hashtags, toLower(word[1:]))
		}
	}
	return hashtags
}

func splitWords(text string) []string {
	var words []string
	var current []rune
	for _, r := range text {
		if r == ' ' || r == '\n' || r == '\t' || r == '\r' {
			if len(current) > 0 {
				words = append(words, string(current))
				current = []rune{}
			}
		} else {
			current = append(current, r)
		}
	}
	if len(current) > 0 {
		words = append(words, string(current))
	}
	return words
}

func containsAllHashtags(postHashtags, requiredHashtags []string) bool {
	for _, required := range requiredHashtags {
		found := false
		for _, tag := range postHashtags {
			if tag == toLower(required) {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

func truncateText(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen] + "..."
}

func sortSearchResults(results []*PostSearchResult) {
	// Simple bubble sort by relevance score (descending)
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].RelevanceScore > results[i].RelevanceScore {
				results[i], results[j] = results[j], results[i]
			}
		}
	}
}

// DeletePostByUser marks a post as deleted if the user is the author
func (s *MemStore) DeletePostByUser(postID, anonID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, p := range s.posts {
		if p.ID == postID {
			if p.AnonID != anonID {
				return fmt.Errorf("unauthorized: not post author")
			}
			p.Deleted = true
			return nil
		}
	}
	return fmt.Errorf("post not found")
}

// ReactToPost adds or updates a user's reaction to a post
func (s *MemStore) ReactToPost(postID, anonID, reactionType string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Find the post
	var post *Post
	for _, p := range s.posts {
		if p.ID == postID {
			post = p
			break
		}
	}

	if post == nil {
		return fmt.Errorf("post not found")
	}

	if post.Deleted {
		return fmt.Errorf("post is deleted")
	}

	// Initialize reaction map for post if needed
	if s.postReactions[postID] == nil {
		s.postReactions[postID] = make(map[string]*PostReaction)
	}

	// Get existing reaction
	existingReaction := s.postReactions[postID][anonID]

	// If same reaction, remove it (toggle off)
	if existingReaction != nil && existingReaction.ReactionType == reactionType {
		// Decrement counter
		if reactionType == "like" {
			post.Likes--
		} else if reactionType == "dislike" {
			post.Dislikes--
		}
		delete(s.postReactions[postID], anonID)
		return nil
	}

	// If different reaction, update counters
	if existingReaction != nil {
		if existingReaction.ReactionType == "like" {
			post.Likes--
		} else if existingReaction.ReactionType == "dislike" {
			post.Dislikes--
		}
	}

	// Add new reaction
	if reactionType == "like" {
		post.Likes++
	} else if reactionType == "dislike" {
		post.Dislikes++
	}

	s.postReactions[postID][anonID] = &PostReaction{
		PostID:       postID,
		AnonID:       anonID,
		ReactionType: reactionType,
		CreatedAt:    time.Now(),
	}

	return nil
}

// GetPostReaction retrieves a user's reaction to a post
func (s *MemStore) GetPostReaction(postID, anonID string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.postReactions[postID] == nil {
		return "", false
	}

	reaction, ok := s.postReactions[postID][anonID]
	if !ok {
		return "", false
	}

	return reaction.ReactionType, true
}

// AddComment adds a comment to a post
func (s *MemStore) AddComment(comment *PostComment) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Verify post exists
	postExists := false
	for _, p := range s.posts {
		if p.ID == comment.PostID && !p.Deleted {
			postExists = true
			break
		}
	}

	if !postExists {
		return fmt.Errorf("post not found or deleted")
	}

	if s.postComments[comment.PostID] == nil {
		s.postComments[comment.PostID] = make([]*PostComment, 0)
	}

	s.postComments[comment.PostID] = append(s.postComments[comment.PostID], comment)
	return nil
}

// GetComments retrieves all non-deleted comments for a post
func (s *MemStore) GetComments(postID string) []*PostComment {
	s.mu.RLock()
	defer s.mu.RUnlock()

	comments := s.postComments[postID]
	if comments == nil {
		return []*PostComment{}
	}

	result := make([]*PostComment, 0)
	for _, c := range comments {
		if !c.Deleted {
			result = append(result, c)
		}
	}

	return result
}

// GetComment retrieves a comment by ID
func (s *MemStore) GetComment(commentID string) (*PostComment, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, comments := range s.postComments {
		for _, c := range comments {
			if c.ID == commentID {
				return c, true
			}
		}
	}

	return nil, false
}

// DeleteCommentByUser soft-deletes a comment if user is the author
func (s *MemStore) DeleteCommentByUser(commentID, anonID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, comments := range s.postComments {
		for _, c := range comments {
			if c.ID == commentID {
				if c.AnonID != anonID {
					return fmt.Errorf("unauthorized: not comment author")
				}
				c.Deleted = true
				return nil
			}
		}
	}

	return fmt.Errorf("comment not found")
}

// ReactToComment adds or updates a user's reaction to a comment
func (s *MemStore) ReactToComment(commentID, anonID, reactionType string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	var comment *PostComment
	for _, comments := range s.postComments {
		for _, c := range comments {
			if c.ID == commentID {
				comment = c
				break
			}
		}
		if comment != nil {
			break
		}
	}

	if comment == nil {
		return fmt.Errorf("comment not found")
	}

	if comment.Deleted {
		return fmt.Errorf("comment is deleted")
	}

	if s.commentReacts[commentID] == nil {
		s.commentReacts[commentID] = make(map[string]*CommentReaction)
	}

	existingReaction := s.commentReacts[commentID][anonID]

	if existingReaction != nil && existingReaction.ReactionType == reactionType {
		if reactionType == "like" {
			comment.Likes--
		} else if reactionType == "dislike" {
			comment.Dislikes--
		}
		delete(s.commentReacts[commentID], anonID)
		return nil
	}

	if existingReaction != nil {
		if existingReaction.ReactionType == "like" {
			comment.Likes--
		} else if existingReaction.ReactionType == "dislike" {
			comment.Dislikes--
		}
	}

	if reactionType == "like" {
		comment.Likes++
	} else if reactionType == "dislike" {
		comment.Dislikes++
	}

	s.commentReacts[commentID][anonID] = &CommentReaction{
		CommentID:    commentID,
		AnonID:       anonID,
		ReactionType: reactionType,
		CreatedAt:    time.Now(),
	}

	return nil
}

// GetCommentReaction retrieves a user's reaction to a comment
func (s *MemStore) GetCommentReaction(commentID, anonID string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.commentReacts[commentID] == nil {
		return "", false
	}

	reaction, ok := s.commentReacts[commentID][anonID]
	if !ok {
		return "", false
	}

	return reaction.ReactionType, true
}

// AddCommentReply adds a reply to a comment
func (s *MemStore) AddCommentReply(reply *CommentReply) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	commentExists := false
	for _, comments := range s.postComments {
		for _, c := range comments {
			if c.ID == reply.CommentID && !c.Deleted {
				commentExists = true
				break
			}
		}
		if commentExists {
			break
		}
	}

	if !commentExists {
		return fmt.Errorf("comment not found or deleted")
	}

	if s.commentReplies[reply.CommentID] == nil {
		s.commentReplies[reply.CommentID] = make([]*CommentReply, 0)
	}

	s.commentReplies[reply.CommentID] = append(s.commentReplies[reply.CommentID], reply)
	return nil
}

// GetCommentReplies retrieves all non-deleted replies for a comment
func (s *MemStore) GetCommentReplies(commentID string) []*CommentReply {
	s.mu.RLock()
	defer s.mu.RUnlock()

	replies := s.commentReplies[commentID]
	if replies == nil {
		return []*CommentReply{}
	}

	result := make([]*CommentReply, 0)
	for _, r := range replies {
		if !r.Deleted {
			result = append(result, r)
		}
	}

	return result
}

// GetReply retrieves a single reply by ID
func (s *MemStore) GetReply(replyID string) (*CommentReply, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	fmt.Printf("[DEBUG] GetReply searching for id: %s\n", replyID)
	fmt.Printf("[DEBUG] Total comment IDs with replies: %d\n", len(s.commentReplies))

	for commentID, replies := range s.commentReplies {
		fmt.Printf("[DEBUG] Checking commentID %s with %d replies\n", commentID, len(replies))
		for _, r := range replies {
			fmt.Printf("[DEBUG] Comparing reply id %s with search id %s\n", r.ID, replyID)
			if r.ID == replyID {
				fmt.Printf("[DEBUG] Found reply: %+v\n", r)
				return r, true
			}
		}
	}

	fmt.Printf("[DEBUG] Reply not found in store\n")
	return nil, false
}

// DeleteCommentReplyByUser soft-deletes a reply if user is the author
func (s *MemStore) DeleteCommentReplyByUser(replyID, anonID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, replies := range s.commentReplies {
		for _, r := range replies {
			if r.ID == replyID {
				if r.AnonID != anonID {
					return fmt.Errorf("unauthorized: not reply author")
				}
				r.Deleted = true
				return nil
			}
		}
	}

	return fmt.Errorf("reply not found")
}

// GetCommentRepliesCount returns count of non-deleted replies for a comment
func (s *MemStore) GetCommentRepliesCount(commentID string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	replies := s.commentReplies[commentID]
	if replies == nil {
		return 0
	}

	count := 0
	for _, r := range replies {
		if !r.Deleted {
			count++
		}
	}

	return count
}

// ReactToReply adds or updates a user's reaction to a reply
func (s *MemStore) ReactToReply(replyID, anonID, reactionType string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	var reply *CommentReply
	for _, replies := range s.commentReplies {
		for _, r := range replies {
			if r.ID == replyID {
				reply = r
				break
			}
		}
		if reply != nil {
			break
		}
	}

	if reply == nil {
		return fmt.Errorf("reply not found")
	}

	if reply.Deleted {
		return fmt.Errorf("reply is deleted")
	}

	if s.replyReacts[replyID] == nil {
		s.replyReacts[replyID] = make(map[string]*ReplyReaction)
	}

	existingReaction := s.replyReacts[replyID][anonID]

	if existingReaction != nil && existingReaction.ReactionType == reactionType {
		if reactionType == "like" {
			reply.Likes--
		} else if reactionType == "dislike" {
			reply.Dislikes--
		}
		delete(s.replyReacts[replyID], anonID)
		return nil
	}

	if existingReaction != nil {
		if existingReaction.ReactionType == "like" {
			reply.Likes--
		} else if existingReaction.ReactionType == "dislike" {
			reply.Dislikes--
		}
	}

	if reactionType == "like" {
		reply.Likes++
	} else if reactionType == "dislike" {
		reply.Dislikes++
	}

	s.replyReacts[replyID][anonID] = &ReplyReaction{
		ReplyID:      replyID,
		AnonID:       anonID,
		ReactionType: reactionType,
		CreatedAt:    time.Now(),
	}

	return nil
}

// GetReplyReaction retrieves a user's reaction to a reply
func (s *MemStore) GetReplyReaction(replyID, anonID string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.replyReacts[replyID] == nil {
		return "", false
	}

	reaction, ok := s.replyReacts[replyID][anonID]
	if !ok {
		return "", false
	}

	return reaction.ReactionType, true
}

// GetCommentsCount returns count of non-deleted comments for a post
func (s *MemStore) GetCommentsCount(postID string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	comments := s.postComments[postID]
	if comments == nil {
		return 0
	}

	count := 0
	for _, c := range comments {
		if !c.Deleted {
			count++
		}
	}

	return count
}
