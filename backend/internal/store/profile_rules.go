package store

import (
	"errors"
	"regexp"
	"strings"
)

var (
	ErrProfileNotFound   = errors.New("profile not found")
	ErrUsernameTaken     = errors.New("username already taken")
	ErrInvalidUserUpdate = errors.New("invalid profile update")
	ErrAlreadyReported   = errors.New("already reported")
)

var UsernameSuffixRegex = regexp.MustCompile(`^[a-z0-9_]{3,20}$`)

var ReservedUsernameSuffixes = map[string]struct{}{
	"admin":     {},
	"system":    {},
	"support":   {},
	"moderator": {},
	"mod":       {},
	"root":      {},
	"null":      {},
	"me":        {},
	"you":       {},
	"official":  {},
	"staff":     {},
	"owner":     {},
}

const UsernamePrefix = "ghost_"

func NormalizeUsernameSuffix(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}

func BuildUsernameFromSuffix(suffix string) string {
	return UsernamePrefix + suffix
}

func DeriveStatusLabel(reportCount int) string {
	switch {
	case reportCount >= 11:
		return "Under Review"
	case reportCount >= 6:
		return "Flagged"
	case reportCount >= 3:
		return "Observed"
	default:
		return "Clean"
	}
}

func IsReservedUsernameSuffix(suffix string) bool {
	_, exists := ReservedUsernameSuffixes[suffix]
	return exists
}
