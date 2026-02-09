package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"anon-backend/internal/httpctx"
	"anon-backend/internal/ws"
)

type TrustChecker interface {
	// true iff trust is accepted between these two anon ids (either direction)
	IsAccepted(a, b string) bool
}

type wsTicketReq struct {
	Peer string `json:"peer"`
}

type wsTicketResp struct {
	Ticket    string `json:"ticket"`
	ExpiresIn int    `json:"expires_in"`
}

func CreateWSTicket(tickets *ws.TicketStore, trust TrustChecker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "missing bearer token", http.StatusUnauthorized)
			return
		}
		me := claims.AnonID

		var req wsTicketReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		if req.Peer == "" {
			http.Error(w, "peer required", http.StatusBadRequest)
			return
		}
		if req.Peer == me {
			http.Error(w, "peer cannot be self", http.StatusBadRequest)
			return
		}

		if !trust.IsAccepted(me, req.Peer) {
			http.Error(w, "not trusted", http.StatusForbidden)
			return
		}

		tok := ws.RandomToken()
		tickets.Create(tok, me, req.Peer, 30*time.Second)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(wsTicketResp{
			Ticket:    tok,
			ExpiresIn: 30,
		})
	}
}
