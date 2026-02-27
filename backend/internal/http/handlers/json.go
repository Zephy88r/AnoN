package handlers

import (
	"encoding/json"
	"net/http"
)

type errorResponse struct {
	Error   string                 `json:"error"`
	Code    string                 `json:"code,omitempty"`
	Details map[string]interface{} `json:"details,omitempty"`
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	writeJSONErrorWithDetails(w, status, message, "", nil)
}

func writeJSONErrorWithDetails(w http.ResponseWriter, status int, message, code string, details map[string]interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorResponse{Error: message, Code: code, Details: details})
}
