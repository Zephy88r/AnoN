package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

// AnonID = HMAC-SHA256(deviceKey). Non-reversible, stable per deviceKey.
func AnonID(deviceKey, hmacKey string) string {
	m := hmac.New(sha256.New, []byte(hmacKey))
	m.Write([]byte(deviceKey))
	return hex.EncodeToString(m.Sum(nil))
}
