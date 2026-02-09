package types

type BootstrapRequest struct {
	DeviceKey string `json:"device_key"`
	Region    string `json:"region,omitempty"`
}

type BootstrapResponse struct {
	Token  string `json:"token"`
	AnonID string `json:"anon_id"` // optional: can omit in prod; useful for debugging early
}

type MeResponse struct {
	AnonID string `json:"anon_id"`
	Region string `json:"region,omitempty"`
	ExpISO string `json:"expires_at"`
}
