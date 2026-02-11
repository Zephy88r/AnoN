package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/security"
	"anon-backend/internal/store"
	"anon-backend/internal/types"
)

func LinkCardCreate(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.LinkCardCreateRequest
		_ = json.NewDecoder(r.Body).Decode(&req)

		ttlMin := req.TTLMinutes
		if ttlMin <= 0 {
			ttlMin = 1440 // 1 day default
		}

		code, err := security.NewInviteCode(10)
		if err != nil {
			http.Error(w, "failed to create code", http.StatusInternalServerError)
			return
		}

		now := time.Now()
		card := &store.LinkCard{
			Code:      code,
			OwnerAnon: claims.AnonID,
			Status:    store.CardActive,
			CreatedAt: now,
			ExpiresAt: now.Add(time.Duration(ttlMin) * time.Minute),
		}

		if err := store.DefaultStore().PutCard(card); err != nil {
			log.Printf("persist link card: failed: %v", err)
			http.Error(w, "failed to persist link card", http.StatusInternalServerError)
			return
		}
		log.Printf("persist link card: ok")

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.LinkCardDTO{
			Code:   card.Code,
			Status: string(card.Status),
			ExpISO: card.ExpiresAt.Format(time.RFC3339),
		})
	}
}

func LinkCardMine(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		cards := store.DefaultStore().CardsByOwner(claims.AnonID)
		out := make([]types.LinkCardDTO, 0, len(cards))

		now := time.Now()
		for _, c := range cards {
			status := c.Status
			if status == store.CardActive && now.After(c.ExpiresAt) {
				status = store.CardExpired
			}
			out = append(out, types.LinkCardDTO{
				Code:   c.Code,
				Status: string(status),
				ExpISO: c.ExpiresAt.Format(time.RFC3339),
			})
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(out)
	}
}
