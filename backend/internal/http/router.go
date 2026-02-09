package http

import (
	"net/http"

	"anon-backend/internal/config"
	"anon-backend/internal/http/handlers"
	"anon-backend/internal/store"
	"anon-backend/internal/ws"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// trustAdapter lets WS handlers ask trust questions safely
type trustAdapter struct {
	store *store.MemStore
}

func (t trustAdapter) IsAccepted(a, b string) bool {
	return t.store.TrustAccepted(a, b)
}

func NewRouter(cfg config.Config) http.Handler {
	r := chi.NewRouter()

	// ✅ middleware first
	r.Use(middleware.RealIP)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(CORS([]string{"http://localhost:5173"}))

	// ✅ shared stores
	mem := store.DefaultStore()
	tickets := ws.NewTicketStore()
	hub := ws.NewHub()
	go hub.Run()

	trust := trustAdapter{store: mem}

	// -------- SESSION --------
	r.Route("/session", func(sr chi.Router) {
		sr.Post("/bootstrap", handlers.SessionBootstrap(cfg))
		sr.With(SessionAuth(cfg)).Get("/me", handlers.SessionMe(cfg))
	})

	// -------- LINK CARDS --------
	r.Route("/link-cards", func(lc chi.Router) {
		lc.With(SessionAuth(cfg)).Post("/create", handlers.LinkCardCreate(cfg))
		lc.With(SessionAuth(cfg)).Get("/mine", handlers.LinkCardMine(cfg))
	})

	// -------- TRUST --------
	r.Route("/trust", func(tr chi.Router) {
		tr.With(SessionAuth(cfg)).Post("/request", handlers.TrustRequest(cfg))
		tr.With(SessionAuth(cfg)).Post("/respond", handlers.TrustRespond(cfg))
		tr.With(SessionAuth(cfg)).Get("/status", handlers.TrustStatus(cfg))
	})

	// -------- WS --------
	r.With(SessionAuth(cfg)).Post("/ws/ticket", handlers.CreateWSTicket(tickets, trust))
	r.Get("/ws/chat", handlers.WSChat(hub, tickets, cfg, trust))

	// -------- HEALTH --------
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	return r
}
