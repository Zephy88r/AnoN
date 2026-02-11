package config

import (
	"os"
	"time"
)

type Config struct {
	Addr        string
	JWTSecret   string
	JWTTTL      time.Duration
	AnonHMACKey string
	DatabaseURL string
	AdminEmail  string
	AdminPass   string
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

	return Config{
		Addr:        addr,
		JWTSecret:   jwtSecret,
		JWTTTL:      d,
		AnonHMACKey: anonKey,
		DatabaseURL: dbURL,
		AdminEmail:  adminEmail,
		AdminPass:   adminPass,
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
