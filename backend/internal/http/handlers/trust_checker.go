package handlers

import "anon-backend/internal/store"

type trustChecker struct {
	store *store.MemStore
}

func NewTrustChecker(s *store.MemStore) TrustChecker {
	return &trustChecker{store: s}
}

// IsAccepted returns true if trust is accepted between two anon ids
func (t *trustChecker) IsAccepted(a, b string) bool {
	return t.store.TrustAccepted(a, b)
}
