package httpctx

import "context"

func AnonID(ctx context.Context) string {
	c := ClaimsFromContext(ctx)
	if c == nil {
		return ""
	}
	return c.AnonID
}
