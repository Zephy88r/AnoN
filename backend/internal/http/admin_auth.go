package http

import (
	"net/http"
	"strings"

	"anon-backend/internal/config"
	"anon-backend/internal/security"
)

// AdminAuth middleware checks for admin session token in Authorization header
func AdminAuth(cfg config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
				http.Error(w, "missing admin token", http.StatusUnauthorized)
				return
			}

			token := strings.TrimPrefix(auth, "Bearer ")
			if _, err := security.VerifyAdminJWT(cfg.JWTSecret, token); err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
