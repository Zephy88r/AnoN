package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/store"
	"anon-backend/internal/types"
)

func TrustRequest(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.TrustRequestIn
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		req.Code = strings.TrimSpace(req.Code)
		if req.Code == "" {
			http.Error(w, "code required", http.StatusBadRequest)
			return
		}

		st := store.DefaultStore()
		card, ok := st.GetCard(req.Code)
		if !ok {
			http.Error(w, "code not found", http.StatusNotFound)
			return
		}

		now := time.Now()
		if card.Status != store.CardActive || now.After(card.ExpiresAt) {
			http.Error(w, "code not active", http.StatusBadRequest)
			return
		}

		if card.OwnerAnon == claims.AnonID {
			http.Error(w, "cannot trust yourself", http.StatusBadRequest)
			return
		}

		// Mark code as used (one-time)
		card.Status = store.CardUsed
		card.UsedBy = claims.AnonID

		tr := &store.TrustRequest{
			ID:        "tr_" + req.Code + "_" + now.Format("20060102150405"),
			Code:      req.Code,
			FromAnon:  claims.AnonID,
			ToAnon:    card.OwnerAnon,
			Status:    store.TrustPending,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := st.PutCard(card); err != nil {
			log.Printf("persist trust card update: failed: %v", err)
			http.Error(w, "failed to persist trust card", http.StatusInternalServerError)
			return
		}
		if err := st.PutTrust(tr); err != nil {
			log.Printf("persist trust request: failed: %v", err)
			http.Error(w, "failed to persist trust request", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.TrustRequestOut{
			RequestID: tr.ID,
			Status:    string(tr.Status),
		})
	}
}

func TrustRespond(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.TrustRespondIn
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		req.Decision = strings.ToLower(strings.TrimSpace(req.Decision))
		if req.RequestID == "" || (req.Decision != "accepted" && req.Decision != "declined") {
			http.Error(w, "request_id and valid decision required", http.StatusBadRequest)
			return
		}

		st := store.DefaultStore()
		tr, ok := st.GetTrust(req.RequestID)
		if !ok {
			http.Error(w, "trust request not found", http.StatusNotFound)
			return
		}

		// Only the recipient (code owner) can respond
		if tr.ToAnon != claims.AnonID {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		if tr.Status != store.TrustPending {
			http.Error(w, "already resolved", http.StatusBadRequest)
			return
		}

		tr.UpdatedAt = time.Now()
		if req.Decision == "accepted" {
			tr.Status = store.TrustAccepted
		} else {
			tr.Status = store.TrustDeclined
		}

		if err := st.PutTrust(tr); err != nil {
			log.Printf("persist trust response: failed: %v", err)
			http.Error(w, "failed to persist trust response", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.TrustRequestOut{
			RequestID: tr.ID,
			Status:    string(tr.Status),
		})
	}
}

func TrustStatus(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		all := store.DefaultStore().TrustForAnon(claims.AnonID)
		out := types.TrustStatusOut{
			Incoming: []types.TrustItem{},
			Outgoing: []types.TrustItem{},
		}

		for _, t := range all {
			item := types.TrustItem{
				RequestID: t.ID,
				Code:      t.Code,
				Status:    string(t.Status),
				FromAnon:  t.FromAnon,
				ToAnon:    t.ToAnon,
			}
			if t.ToAnon == claims.AnonID {
				out.Incoming = append(out.Incoming, item)
			} else {
				out.Outgoing = append(out.Outgoing, item)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(out)
	}
}
