package httpctx

import (
	"context"

	"anon-backend/internal/security"
)

type ctxKey string

const claimsKey ctxKey = "session_claims"

func WithClaims(ctx context.Context, claims *security.SessionClaims) context.Context {
	return context.WithValue(ctx, claimsKey, claims)
}

func ClaimsFromContext(ctx context.Context) *security.SessionClaims {
	v := ctx.Value(claimsKey)
	if c, ok := v.(*security.SessionClaims); ok {
		return c
	}
	return nil
}
