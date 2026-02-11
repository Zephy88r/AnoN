package security

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type SessionClaims struct {
	AnonID string `json:"aid"`
	Region string `json:"r,omitempty"`
	jwt.RegisteredClaims
}

type AdminClaims struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

func SignSessionJWT(secret string, ttl time.Duration, anonID, region string) (string, error) {
	now := time.Now()
	claims := SessionClaims{
		AnonID: anonID,
		Region: region,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}

	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func VerifySessionJWT(secret, tokenStr string) (*SessionClaims, error) {
	tok, err := jwt.ParseWithClaims(tokenStr, &SessionClaims{}, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := tok.Claims.(*SessionClaims)
	if !ok || !tok.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}

func SignAdminJWT(secret string, ttl time.Duration, email string) (string, error) {
	now := time.Now()
	claims := AdminClaims{
		Email: email,
		Role:  "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}

	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func VerifyAdminJWT(secret, tokenStr string) (*AdminClaims, error) {
	tok, err := jwt.ParseWithClaims(tokenStr, &AdminClaims{}, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := tok.Claims.(*AdminClaims)
	if !ok || !tok.Valid || claims.Role != "admin" {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}
