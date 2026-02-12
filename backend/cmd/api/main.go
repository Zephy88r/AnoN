package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"anon-backend/internal/config"
	httpx "anon-backend/internal/http"
	"anon-backend/internal/store"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := config.Load()

	// Initialize database if DATABASE_URL is provided
	if cfg.DatabaseURL != "" {
		db, err := sql.Open("postgres", cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("failed to connect to database: %v", err)
		}
		defer db.Close()

		// Test connection
		if err := db.Ping(); err != nil {
			log.Fatalf("failed to ping database: %v", err)
		}
		log.Println("✓ Connected to PostgreSQL")

		// Run migrations
		if err := store.RunMigrations(db); err != nil {
			log.Fatalf("failed to run migrations: %v", err)
		}

		// Initialize store with PostgreSQL
		pgStore := store.NewPgStore(db)
		store.Initialize(pgStore)
		log.Println("✓ Using PostgreSQL store")
	} else {
		// Fall back to in-memory store
		memStore := store.NewMemStore()
		store.Initialize(memStore)
		log.Println("⚠ Using in-memory store (set DATABASE_URL for PostgreSQL)")
	}

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpx.NewRouter(cfg),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("API listening on %s", cfg.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
	_ = os.Stdout
}
