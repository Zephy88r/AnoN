# AnoN Backend — Go + PostgreSQL

Anonymous social platform with trust system, link cards, posts, geolocation, and WebSocket messaging.

## Features

✅ **JWT-based Authentication** — Cryptographic session IDs from device keys  
✅ **Link Card Invites** — One-time codes to initiate trust  
✅ **Trust System** — Bidirectional trust requests (pending/accepted/declined)  
✅ **Feed / Posts** — Anonymous posts with daily rate limit (3/day)  
✅ **Geolocation Pings** — Location tracking with radius-based queries  
✅ **WebSocket Chat** — Real-time messaging between trusted users  
✅ **PostgreSQL** — Persistent storage with auto-migrations  

## Architecture

- **Framework**: Chi v5 HTTP router
- **Database**: PostgreSQL (with fallback to in-memory)
- **Auth**: JWT (HS256)
- **Messaging**: WebSocket with memory-backed tickets

## Quick Start

### Prerequisites
- Go 1.22+
- PostgreSQL 12+
- `pq` driver: `go get github.com/lib/pq`

### Setup (Windows PowerShell)

```powershell
# 1. Install dependencies
cd backend
go get github.com/lib/pq
go mod tidy

# 2. Create database
psql -U postgres -c "CREATE DATABASE anon_db;"

# 3. Set environment
$env:DATABASE_URL = "postgres://postgres:password@localhost:5432/anon_db?sslmode=disable"

# 4. Run
go run ./cmd/api
```

### Setup (Linux/Mac)

```bash
cd backend
go get github.com/lib/pq
go mod tidy

psql -U postgres -c 'CREATE DATABASE anon_db;'
export DATABASE_URL="postgres://postgres:password@localhost:5432/anon_db?sslmode=disable"
go run ./cmd/api
```

### Without PostgreSQL (In-Memory Dev Mode)

```bash
go run ./cmd/api
# ⚠ Using in-memory store (set DATABASE_URL for PostgreSQL)
```

## API Routes

### Session / Auth
```
POST   /session/bootstrap        — Get anonymous session token
GET    /session/me               — Get current user (authenticated)
```

### Link Cards (Invites)
```
POST   /link-cards/create        — Create shareable invite code
GET    /link-cards/mine          — List your invite codes
```

### Trust System
```
POST   /trust/request            — Send trust request via code
POST   /trust/respond            — Accept/decline request
GET    /trust/status             — Get incoming/outgoing requests
```

### Posts & Feed
```
POST   /posts/create             — Post to feed (max 280 chars, 3/day limit)
GET    /posts/feed               — Get up to 50 newest posts
```

### Geolocation
```
POST   /geo/ping                 — Submit current location
GET    /geo/nearby               — Find users within radius
```

### WebSocket (Real-Time Chat)
```
POST   /ws/ticket                — Get temporary session ticket
WS     /ws/chat                  — Connect with ticket to join room
```

## Database Schema

### link_cards
- `code` (PK) — invite code
- `owner_anon` — creator's anonymous ID
- `status` — active, used, revoked, expired
- `expires_at` — code expiration time
- `used_by` — who used it (if any)

### trust_requests
- `id` (PK) — unique request ID
- `from_anon`, `to_anon` — participants
- `status` — pending, accepted, declined
- `created_at`, `updated_at` — timestamps
- `code` — which invite was used

### posts
- `id` (PK)
- `anon_id` — author
- `text` — post content
- `created_at` — timestamp

### geo_pings
- `id` (PK, auto-increment)
- `anon_id` — pinger
- `lat`, `lng` — coordinates
- `timestamp` — when pinged

### post_daily_limits
- `anon_id`, `date_key` (PK) — per-anon daily counter
- `count` — posts created today (0-3)

## Configuration

All settings are environment variables:

```bash
ADDR=:8080                              # HTTP server address
JWT_SECRET=your_secret_key              # JWT signing key (change in prod!)
ANON_HMAC_KEY=your_hmac_key             # Anon ID derivation key
DATABASE_URL=...                        # PostgreSQL connection string
JWT_TTL=30m                             # Session duration
```

See `.env.example` for a template.

## Development

### Building
```bash
go build ./cmd/api
```

### Testing with curl
```bash
# Bootstrap session
TOKEN=$(curl -s -X POST http://localhost:8080/session/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"device_key":"my-device"}' | jq -r .token)

# Create post
curl -X POST http://localhost:8080/posts/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world!"}'

# Get feed
curl http://localhost:8080/posts/feed \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Database Utilities

```bash
# Windows PowerShell
.\db-utils.ps1 reset      # Reset database
.\db-utils.ps1 backup     # Create backup
.\db-utils.ps1 info       # Show stats

# Linux/Mac
./db-utils.sh reset       # Reset database
./db-utils.sh backup      # Create backup
./db-utils.sh restore <file>  # Restore backup
```

## Migrations

Migrations run automatically on startup. To manually run SQL:

```bash
psql -U postgres -d anon_db < migrations/001_init_schema.sql
```

## Troubleshooting

### "connection refused"
```bash
psql -U postgres  # Check PostgreSQL is running
```

### "database does not exist"
```bash
psql -U postgres -c 'CREATE DATABASE anon_db;'
```

### "migration failed"
```bash
# Reset schema
psql -U postgres -d anon_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

## Production Checklist

- [ ] Change `JWT_SECRET` and `ANON_HMAC_KEY` to strong random values
- [ ] Use PostgreSQL with SSL: `sslmode=require`
- [ ] Enable database backups
- [ ] Set up connection pooling (pgbouncer or pgx)
- [ ] Add rate limiting middleware
- [ ] Monitor database disk usage
- [ ] Use CORS whitelist for frontend domain
- [ ] Run under process manager (systemd, supervisor, etc.)

## Next Steps

1. **Verify PostgreSQL works** — Restart server, check data persists
2. **Admin Panel** — Add read-only dashboard (auth + tables)
3. **Rate Limiting** — Throttle requests per anon
4. **Docker** — Containerize for deployment
5. **Analytics** — Track growth and user behavior

## Files & Structure

```
backend/
├── cmd/api/
│   └── main.go                 — Server entry point
├── internal/
│   ├── config/
│   │   └── config.go           — Environment loading
│   ├── http/
│   │   ├── router.go           — Chi routes
│   │   ├── cors.go, middleware.go
│   │   └── handlers/           — HTTP handlers
│   ├── httpctx/
│   │   └── anon.go, httpctx.go — JWT claims context
│   ├── security/
│   │   ├── jwt.go              — Token signing
│   │   ├── annoid.go           — Anon ID generation
│   │   └── code.go             — Random codes
│   ├── store/
│   │   ├── interface.go        — Store abstraction
│   │   ├── mem.go              — In-memory store
│   │   ├── postgres.go         — PostgreSQL store
│   │   ├── migrate.go          — Auto-migrations
│   │   └── migrations/         — SQL schema
│   ├── types/
│   │   ├── session.go, trust.go, posts.go, geo.go
│   └── ws/
│       ├── hub.go              — WebSocket hub
│       ├── conn.go, message.go, ticket_store.go
├── migrations/                 — SQL migration files
├── go.mod, go.sum
├── POSTGRES_MIGRATION.md       — PostgreSQL setup guide
├── MIGRATION_SUMMARY.md        — High-level overview
└── README.md                   — This file
```

## Security Notes

- Anonymous IDs are HMAC-derived from device keys (deterministic, not stored)
- JWT tokens are short-lived (default 30 min)
- Trust system requires one-time invite codes
- WebSocket tickets expire quickly and are single-use
- All user input is validated and sanitized

## License

MIT
