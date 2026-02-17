package types

type DeviceChallengeRequest struct {
	DevicePublicID string `json:"device_public_id"`
}

type DeviceChallengeResponse struct {
	Nonce        string `json:"nonce"`
	ExpiresInSec int    `json:"expires_in_sec"`
}

type BootstrapRequest struct {
	DevicePublicID   string `json:"device_public_id"`
	Nonce            string `json:"nonce"`
	Ts               int64  `json:"ts"`
	Proof            string `json:"proof"`
	Region           string `json:"region,omitempty"`
	DeviceSecretHash string `json:"device_secret_hash,omitempty"`
}

type BootstrapResponse struct {
	Token     string `json:"token"`
	AnonID    string `json:"anon_id"`
	Username  string `json:"username"`
	ExpiresAt string `json:"expires_at"`
}

type MeResponse struct {
	AnonID   string `json:"anon_id"`
	Username string `json:"username"`
	Region   string `json:"region,omitempty"`
	ExpISO   string `json:"expires_at"`
}
