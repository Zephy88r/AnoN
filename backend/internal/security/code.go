package security

import (
	"crypto/rand"
	"encoding/base32"
	"strings"
)

func NewInviteCode(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	// Base32 uppercase, no padding, trim length
	s := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
	s = strings.TrimRight(s, "=")
	// Example: take first 12 chars to keep codes short
	if len(s) > 12 {
		s = s[:12]
	}
	return s, nil
}
