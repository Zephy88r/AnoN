package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/ws"

	"github.com/gorilla/websocket"
)

// ---- minimal room-based broadcaster (doesn't use ws.Hub/ws.Conn) ----

type room struct {
	mu    sync.Mutex
	conns map[*websocket.Conn]struct{}
}

func newRoom() *room {
	return &room{conns: make(map[*websocket.Conn]struct{})}
}

func (r *room) add(c *websocket.Conn) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.conns[c] = struct{}{}
}

func (r *room) remove(c *websocket.Conn) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.conns, c)
}

func (r *room) broadcast(sender *websocket.Conn, data []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for c := range r.conns {
		// send to everyone including sender? choose:
		// - include sender (echo) for easier UI ack
		// - or skip sender if you want only peer delivery
		_ = c.WriteMessage(websocket.TextMessage, data)
	}
}

var rooms sync.Map // map[string]*room

func roomKey(a, b string) string {
	p := []string{a, b}
	sort.Strings(p)
	return p[0] + ":" + p[1]
}

func getRoom(k string) *room {
	if v, ok := rooms.Load(k); ok {
		return v.(*room)
	}
	r := newRoom()
	actual, _ := rooms.LoadOrStore(k, r)
	return actual.(*room)
}

// ---- message shapes ----

type incomingMsg struct {
	Type     string `json:"type"`                // "msg"
	ClientID string `json:"client_id,omitempty"` // optional
	Text     string `json:"text,omitempty"`
	SentAt   string `json:"sent_at,omitempty"`
}

type serverMsg struct {
	Type   string `json:"type"` // "msg" | "err" | "sys"
	From   string `json:"from,omitempty"`
	To     string `json:"to,omitempty"`
	Text   string `json:"text,omitempty"`
	AtISO  string `json:"at,omitempty"`
	Detail string `json:"detail,omitempty"`
}

// WSChat upgrades to websocket using a one-time ticket.
// Route: GET /ws/chat?ticket=...
//
// NOTE: We accept hub param to match your router signature,
// but we intentionally don't use it to avoid your unexported fields issue.
func WSChat(_ *ws.Hub, tickets *ws.TicketStore, cfg config.Config, trust TrustChecker) http.HandlerFunc {
	up := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			// Dev-friendly: allow localhost Vite and also "null" origin (console tests)
			origin := r.Header.Get("Origin")
			if origin == "" || origin == "null" {
				return true
			}
			// allow your Vite dev origin
			if origin == "http://localhost:5173" {
				return true
			}
			// also allow if you run with a different host but same port
			if strings.HasPrefix(origin, "http://localhost:") {
				return true
			}
			_ = cfg // keep cfg available if you later want allow-list from config
			return false
		},
	}

	return func(w http.ResponseWriter, r *http.Request) {
		tok := r.URL.Query().Get("ticket")
		if tok == "" {
			http.Error(w, "missing ticket", http.StatusBadRequest)
			return
		}

		t, ok := tickets.Consume(tok)
		if !ok || t == nil {
			http.Error(w, "invalid or expired ticket", http.StatusUnauthorized)
			return
		}

		me := t.MyAnon
		peer := t.PeerAnon
		if me == "" || peer == "" {
			http.Error(w, "bad ticket", http.StatusUnauthorized)
			return
		}

		// Ensure trust still accepted at connect time
		if !trust.IsAccepted(me, peer) {
			http.Error(w, "not trusted", http.StatusForbidden)
			return
		}

		conn, err := up.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		// timeouts + pings
		conn.SetReadLimit(64 * 1024)
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		conn.SetPongHandler(func(string) error {
			_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil
		})

		// join room
		rk := roomKey(me, peer)
		rm := getRoom(rk)
		rm.add(conn)
		defer rm.remove(conn)

		// optional: send system hello
		hello, _ := json.Marshal(serverMsg{
			Type:  "sys",
			Text:  "connected",
			From:  me,
			To:    peer,
			AtISO: time.Now().Format(time.RFC3339),
		})
		_ = conn.WriteMessage(websocket.TextMessage, hello)

		// reader loop
		for {
			mt, data, err := conn.ReadMessage()
			if err != nil {
				break
			}
			if mt != websocket.TextMessage {
				continue
			}

			var in incomingMsg
			if err := json.Unmarshal(data, &in); err != nil {
				b, _ := json.Marshal(serverMsg{
					Type:   "err",
					Detail: "bad json",
					AtISO:  time.Now().Format(time.RFC3339),
				})
				_ = conn.WriteMessage(websocket.TextMessage, b)
				continue
			}

			if in.Type != "msg" {
				b, _ := json.Marshal(serverMsg{
					Type:   "err",
					Detail: "unknown message type",
					AtISO:  time.Now().Format(time.RFC3339),
				})
				_ = conn.WriteMessage(websocket.TextMessage, b)
				continue
			}

			out, _ := json.Marshal(serverMsg{
				Type:  "msg",
				From:  me,
				To:    peer,
				Text:  in.Text,
				AtISO: time.Now().Format(time.RFC3339),
			})

			// broadcast to both sides connected to this room
			rm.broadcast(conn, out)
		}
	}
}
