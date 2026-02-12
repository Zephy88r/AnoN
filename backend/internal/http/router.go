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
	store store.Store
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
	str := store.DefaultStore()
	tickets := ws.NewTicketStore()
	hub := ws.NewHub()

	trust := trustAdapter{store: str}

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

	// -------- POSTS (FEED) --------
	r.Route("/posts", func(pr chi.Router) {
		pr.With(SessionAuth(cfg)).Post("/create", handlers.PostCreate(cfg))
		pr.With(SessionAuth(cfg)).Get("/feed", handlers.PostFeed(cfg))
		pr.With(SessionAuth(cfg)).Get("/remaining", handlers.PostRemainingCount(cfg))
		pr.With(SessionAuth(cfg)).Post("/delete", handlers.PostDelete(cfg))
		pr.With(SessionAuth(cfg)).Post("/like", handlers.PostLike(cfg))
		pr.With(SessionAuth(cfg)).Post("/dislike", handlers.PostDislike(cfg))

		// Comments
		pr.With(SessionAuth(cfg)).Post("/comments/create", handlers.CommentCreate(cfg))
		pr.With(SessionAuth(cfg)).Get("/comments", handlers.CommentGet(cfg))
		pr.With(SessionAuth(cfg)).Post("/comments/delete", handlers.CommentDelete(cfg))
		pr.With(SessionAuth(cfg)).Post("/comments/like", handlers.CommentLike(cfg))
		pr.With(SessionAuth(cfg)).Post("/comments/dislike", handlers.CommentDislike(cfg))
		pr.With(SessionAuth(cfg)).Post("/comments/replies/create", handlers.CommentReplyCreate(cfg))
		pr.With(SessionAuth(cfg)).Get("/comments/replies", handlers.CommentReplyGet(cfg))
		pr.With(SessionAuth(cfg)).Post("/comments/replies/delete", handlers.CommentReplyDelete(cfg))
	})

	// Admin routes (protected by admin session token)
	r.Post("/admin/login", handlers.AdminLogin(cfg))
	r.Route("/admin", func(ar chi.Router) {
		ar.Use(AdminAuth(cfg))
		ar.Get("/posts", handlers.AdminGetPosts(cfg))
		ar.Post("/posts/delete", handlers.AdminDeletePost(cfg))
		ar.Get("/users", handlers.AdminGetUsers(cfg))
		ar.Get("/stats", handlers.AdminGetStats(cfg))
		ar.Get("/sessions", handlers.AdminGetSessions(cfg))
		ar.Get("/trust", handlers.AdminGetTrustGraph(cfg))
		ar.Get("/abuse", handlers.AdminGetAbuseDashboard(cfg))
		ar.Get("/audit", handlers.AdminGetAuditLog(cfg))
		ar.Get("/health", handlers.AdminGetHealth(cfg))
	})

	// -------- GEO (MAP) --------
	r.Route("/geo", func(gr chi.Router) {
		gr.With(SessionAuth(cfg)).Post("/ping", handlers.GeoPing(cfg))
		gr.With(SessionAuth(cfg)).Get("/nearby", handlers.GeoNearby(cfg))
	})

	// -------- HEALTH --------
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	return r
}
