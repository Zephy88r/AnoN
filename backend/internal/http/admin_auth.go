package http

import (
	"net/http"
	"strings"

	"anon-backend/internal/config"
)

// AdminAuth middleware checks for admin key in Authorization header
func AdminAuth(cfg config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check for ?admin_key=... query param OR Authorization header
			queryKey := r.URL.Query().Get("admin_key")
			headerKey := ""

			if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
				headerKey = strings.TrimPrefix(auth, "Bearer ")
			}

			adminKey := cfg.AdminKey
			if adminKey == "" {
				http.Error(w, "admin panel disabled (no ADMIN_KEY set)", http.StatusForbidden)
				return
			}

			if queryKey != adminKey && headerKey != adminKey {
				http.Error(w, "unauthorized: invalid admin key", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
