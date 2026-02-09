package types

type LinkCardCreateRequest struct {
	TTLMinutes int `json:"ttl_minutes,omitempty"` // default 1440 (1 day)
}

type LinkCardDTO struct {
	Code   string `json:"code"`
	Status string `json:"status"`
	ExpISO string `json:"expires_at"`
}

type TrustRequestIn struct {
	Code string `json:"code"`
}

type TrustRequestOut struct {
	RequestID string `json:"request_id"`
	Status    string `json:"status"`
}

type TrustRespondIn struct {
	RequestID string `json:"request_id"`
	Decision  string `json:"decision"` // "accepted" or "declined"
}

type TrustStatusOut struct {
	Incoming []TrustItem `json:"incoming"`
	Outgoing []TrustItem `json:"outgoing"`
}

type TrustItem struct {
	RequestID string `json:"request_id"`
	Code      string `json:"code"`
	Status    string `json:"status"`
	FromAnon  string `json:"from_anon,omitempty"`
	ToAnon    string `json:"to_anon,omitempty"`
}
