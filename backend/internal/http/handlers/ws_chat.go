package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/ws"

	"github.com/gorilla/websocket"
)

type incomingMsg struct {
	Type   string `json:"type"`    // "msg"
	Text   string `json:"text"`
	SentAt string `json:"sent_at"` // ISO
}

type outboundMsg struct {
	Type   string `json:"type"` // "msg"
	From   string `json:"from"`
	Text   string `json:"text"`
	SentAt string `json:"sent_at"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// dev: allow frontend
		return r.Header.Get("Origin") == "http://localhost:5173"
	},
}

func WSChat(hub *ws.Hub, tickets *ws.TicketStore, cfg config.Config, trust TrustChecker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tok := r.URL.Query().Get("ticket")
		if tok == "" {
			http.Error(w, "ticket required", http.StatusBadRequest)
			return
		}

		t, ok := tickets.Consume(tok)
		if !ok {
			http.Error(w, "invalid/expired ticket", http.StatusUnauthorized)
			return
		}

		me := t.MyAnon
		peer := t.PeerAnon

		// 🔒 trust gate (even if someone steals a ticket)
		if !trust.IsAccepted(me, peer) {
			http.Error(w, "not trusted", http.StatusForbidden)
			return
		}

		wsConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		c := ws.NewConn(wsConn, me, peer)
		hub.Register(c)
		defer hub.Unregister(c)

		go func() { c.WritePump() }() // (we'll add method below)

		// read loop: relay -> peer
		_ = wsConn.SetReadDeadline(time.Now().Add(60 * time.Second))
		wsConn.SetPongHandler(func(string) error {
			_ = wsConn.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil
		})

		for {
			_, data, err := wsConn.ReadMessage()
			if err != nil {
				return
			}

			var in incomingMsg
			if err := json.Unmarshal(data, &in); err != nil {
				continue
			}
			if in.Type != "msg" || in.Text == "" {
				continue
			}

			out, _ := json.Marshal(outboundMsg{
				Type:   "msg",
				From:   me,
				Text:   in.Text,
				SentAt: time.Now().UTC().Format(time.RFC3339Nano),
			})

			// deliver to peer and echo back to sender (optional; helps UI)
			hub.SendTo(peer, out)
			hub.SendTo(me, out)
		}
	}
}
