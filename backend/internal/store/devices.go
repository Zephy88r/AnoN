package store

import "time"

type Device struct {
	DevicePublicID   string
	DeviceSecretHash string
	AnonID           string
	Username         string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type DeviceNonce struct {
	DevicePublicID string
	Nonce          string
	ExpiresAt      time.Time
	UsedAt         *time.Time
	CreatedAt      time.Time
}
