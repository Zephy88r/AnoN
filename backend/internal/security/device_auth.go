package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
)

func NewNonce(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func ComputeHMACProof(key []byte, message string) string {
	m := hmac.New(sha256.New, key)
	m.Write([]byte(message))
	return base64.StdEncoding.EncodeToString(m.Sum(nil))
}

func VerifyHMACProof(key []byte, message, proof string) (bool, error) {
	proofBytes, err := base64.StdEncoding.DecodeString(proof)
	if err != nil {
		return false, fmt.Errorf("invalid proof encoding")
	}
	expected := ComputeHMACProof(key, message)
	expectedBytes, err := base64.StdEncoding.DecodeString(expected)
	if err != nil {
		return false, fmt.Errorf("invalid expected proof encoding")
	}
	return hmac.Equal(proofBytes, expectedBytes), nil
}
