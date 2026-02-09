package http

import "net/http"

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowed := map[string]struct{}{}
	for _, o := range allowedOrigins {
		allowed[o] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Only set CORS headers when browser sends Origin
			if origin != "" {
				if _, ok := allowed[origin]; ok {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Vary", "Origin")
					w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
					w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
					// If later you use cookies, turn this on + keep origin specific (not '*')
					// w.Header().Set("Access-Control-Allow-Credentials", "true")
				}
			}

			// Handle preflight
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
