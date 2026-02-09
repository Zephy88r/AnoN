package http

import (
	"net/http"
	"strings"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/security"
)

func SessionAuth(cfg config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
				http.Error(w, "missing bearer token", http.StatusUnauthorized)
				return
			}

			token := strings.TrimPrefix(auth, "Bearer ")
			claims, err := security.VerifySessionJWT(cfg.JWTSecret, token)
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}

			ctx := httpctx.WithClaims(r.Context(), claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
