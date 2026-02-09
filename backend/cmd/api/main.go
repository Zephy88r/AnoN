package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"anon-backend/internal/config"
	httpx "anon-backend/internal/http"
)

func main() {
	cfg := config.Load()

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
