package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"anon-backend/internal/config"
	"anon-backend/internal/httpctx"
	"anon-backend/internal/store"
	"anon-backend/internal/types"
)

func GeoPing(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		var req types.GeoPingRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}

		// Validate lat [-90, 90]
		if req.Lat < -90 || req.Lat > 90 {
			http.Error(w, "lat must be between -90 and 90", http.StatusBadRequest)
			return
		}

		// Validate lng [-180, 180]
		if req.Lng < -180 || req.Lng > 180 {
			http.Error(w, "lng must be between -180 and 180", http.StatusBadRequest)
			return
		}

		// Store ping
		ping := &store.GeoPing{
			AnonID:    claims.AnonID,
			Lat:       req.Lat,
			Lng:       req.Lng,
			Timestamp: time.Now(),
		}

		store.DefaultStore().PutGeo(ping)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.GeoPingResponse{
			AnonID:    ping.AnonID,
			Lat:       ping.Lat,
			Lng:       ping.Lng,
			Timestamp: ping.Timestamp.Format(time.RFC3339),
		})
	}
}

func GeoNearby(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := httpctx.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusUnauthorized)
			return
		}

		// Parse query params
		latStr := r.URL.Query().Get("lat")
		lngStr := r.URL.Query().Get("lng")
		kmStr := r.URL.Query().Get("km")

		if latStr == "" || lngStr == "" {
			http.Error(w, "lat and lng required", http.StatusBadRequest)
			return
		}

		lat, err := strconv.ParseFloat(latStr, 64)
		if err != nil {
			http.Error(w, "invalid lat", http.StatusBadRequest)
			return
		}

		lng, err := strconv.ParseFloat(lngStr, 64)
		if err != nil {
			http.Error(w, "invalid lng", http.StatusBadRequest)
			return
		}

		// Default km to 5 if not provided
		km := 5.0
		if kmStr != "" {
			parsedKm, err := strconv.ParseFloat(kmStr, 64)
			if err == nil && parsedKm > 0 {
				km = parsedKm
			}
		}

		// Validate lat/lng
		if lat < -90 || lat > 90 {
			http.Error(w, "lat must be between -90 and 90", http.StatusBadRequest)
			return
		}
		if lng < -180 || lng > 180 {
			http.Error(w, "lng must be between -180 and 180", http.StatusBadRequest)
			return
		}

		// Get nearby pings
		pings := store.DefaultStore().GetNearby(lat, lng, km)
		out := make([]types.GeoPingResponse, len(pings))

		for i, ping := range pings {
			out[i] = types.GeoPingResponse{
				AnonID:    ping.AnonID,
				Lat:       ping.Lat,
				Lng:       ping.Lng,
				Timestamp: ping.Timestamp.Format(time.RFC3339),
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(types.GeoNearbyResponse{Pings: out})
	}
}
