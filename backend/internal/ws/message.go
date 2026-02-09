package ws

import "time"

// Client → Server
type ClientMessage struct {
	Type     string    `json:"type"`      // "msg"
	ClientID string    `json:"client_id"` // for de-dupe
	Text     string    `json:"text"`
	SentAt   time.Time `json:"sent_at"`
}

// Server → Client
type ServerMessage struct {
	Type   string    `json:"type"` // "msg"
	From   string    `json:"from"` // anon id
	Text   string    `json:"text"`
	SentAt time.Time `json:"sent_at"`
}
