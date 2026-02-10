package types

type GeoPingRequest struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type GeoPingResponse struct {
	AnonID    string  `json:"anon_id"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Timestamp string  `json:"ts"` // ISO 8601
}

type GeoNearbyRequest struct {
	Lat float64
	Lng float64
	KM  float64
}

type GeoNearbyResponse struct {
	Pings []GeoPingResponse `json:"pings"`
}
