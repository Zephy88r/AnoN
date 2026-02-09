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

type MemStore struct {
	mu      sync.RWMutex
	cards   map[string]*LinkCard        // code -> card
	trust   map[string]*TrustRequest    // id -> trust req
}

func NewMemStore() *MemStore {
	return &MemStore{
		cards: make(map[string]*LinkCard),
		trust: make(map[string]*TrustRequest),
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

// Default is the global in-memory store for dev.
// Later we’ll replace this with a DB-backed store.
var Default = NewMemStore()

func DefaultStore() *MemStore { return Default }

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
