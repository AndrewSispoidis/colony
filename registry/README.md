# Colony Registry API

Fastify + Postgres API for the Colony agent registry.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agents` | List agents (`?tag=`, `?q=` filters) |
| GET | `/agents/:ns/:name` | Get latest agent spec |
| GET | `/agents/:ns/:name/:version` | Get specific version |
| GET | `/agents/:ns/:name/versions` | List all versions |
| POST | `/agents` | Publish agent (auth required) |
| GET | `/health` | Health check |

## Deploy to Railway

1. Install the Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Create project: `railway init`
4. Add Postgres: `railway add --plugin postgresql`
5. Set the auth token:
   ```
   railway variables set REGISTRY_AUTH_TOKEN=your-secret-token
   ```
6. Deploy:
   ```
   cd registry
   railway up
   ```

Railway auto-provides `DATABASE_URL`. The server initializes tables and seeds 5 reference agents on first boot.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string (auto-set by Railway) |
| `REGISTRY_AUTH_TOKEN` | Bearer token required for POST /agents |
| `PORT` | Server port (default: 3000) |

## Local Development

```bash
cd registry
npm install
DATABASE_URL=postgres://localhost:5432/colony REGISTRY_AUTH_TOKEN=dev node server.js
```
