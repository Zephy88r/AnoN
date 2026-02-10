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
	AdminKey    string
}

func Load() Config {
	adminKey := getenv("ADMIN_KEY", "")
	addr := getenv("ADDR", ":8080")
	jwtSecret := getenv("JWT_SECRET", "dev_secret_change_me")
	anonKey := getenv("ANON_HMAC_KEY", "dev_anon_hmac_change_me")
	dbURL := getenv("DATABASE_URL", "")

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
		AdminKey:    adminKey,
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
