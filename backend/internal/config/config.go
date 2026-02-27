package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr               string
	JWTSecret          string
	JWTTTL             time.Duration
	AnonHMACKey        string
	DatabaseURL        string
	AdminEmail         string
	AdminPass          string
	MaxSessionsPerUser int
	CORSAllowedOrigins []string
	EnableSeedData     bool
}

func Load() Config {
	adminEmail := getenv("ADMIN_EMAIL", "papa@gmail.com")
	adminPass := getenv("ADMIN_PASSWORD", "papa@")
	addr := getenv("ADDR", ":8080")
	jwtSecret := getenv("JWT_SECRET", "dev_secret_change_me")
	anonKey := getenv("ANON_HMAC_KEY", "dev_anon_hmac_change_me")
	dbURL := getenv("DATABASE_URL", "")
	if dbURL == "" {
		dbURL = getenv("DATABASE_URI", "")
	}

	ttl := getenv("JWT_TTL", "30m")
	d, err := time.ParseDuration(ttl)
	if err != nil {
		d = 30 * time.Minute
	}

	maxSessions := 5
	if maxSessionsStr := getenv("MAX_SESSIONS_PER_USER", "5"); maxSessionsStr != "" {
		if n, err := strconv.Atoi(maxSessionsStr); err == nil && n > 0 {
			maxSessions = n
		}
	}

	corsAllowedOrigins := splitCSV(getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"))
	if len(corsAllowedOrigins) == 0 {
		corsAllowedOrigins = []string{"http://localhost:5173"}
	}

	enableSeedData := strings.EqualFold(getenv("ENABLE_SEED_DATA", "false"), "true")

	return Config{
		Addr:               addr,
		JWTSecret:          jwtSecret,
		JWTTTL:             d,
		AnonHMACKey:        anonKey,
		DatabaseURL:        dbURL,
		AdminEmail:         adminEmail,
		AdminPass:          adminPass,
		MaxSessionsPerUser: maxSessions,
		CORSAllowedOrigins: corsAllowedOrigins,
		EnableSeedData:     enableSeedData,
	}
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
