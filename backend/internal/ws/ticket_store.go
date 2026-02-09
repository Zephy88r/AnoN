package ws

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type Ticket struct {
	MyAnon   string
	PeerAnon string
	Expires  time.Time
	Used     bool
}

type TicketStore struct {
	mu sync.Mutex
	m  map[string]*Ticket
}

func NewTicketStore() *TicketStore {
	return &TicketStore{m: make(map[string]*Ticket)}
}

func RandomToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return "wst_" + hex.EncodeToString(b)
}

func (s *TicketStore) Create(token, my, peer string, ttl time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.m[token] = &Ticket{
		MyAnon:   my,
		PeerAnon: peer,
		Expires:  time.Now().Add(ttl),
	}
}

func (s *TicketStore) Consume(token string) (*Ticket, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.m[token]
	if !ok || t.Used || time.Now().After(t.Expires) {
		return nil, false
	}
	t.Used = true
	return t, true
}

func (t *Ticket) RoomID() string {
	a := t.MyAnon
	b := t.PeerAnon
	if a < b {
		return a + ":" + b
	}
	return b + ":" + a
}

