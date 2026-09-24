# GCP Memorystore (Redis) integration

The store uses Redis for two things, both fail-safe when Redis is absent:

1. **Shared cache** — `src/lib/redis.ts` (`cacheGet` / `cacheSet` / `cacheDel` /
   `cacheFlushAll`). Complements the per-instance memo cache; admin write paths
   flush both layers via `memoInvalidateCatalog()`.
2. **Global rate limiting** — `rateLimit({...}).checkAsync(req)` in
   `src/lib/rate-limit.ts` counts hits in Redis, so limits are global across
   every instance instead of per-isolate (guest order POST and order tracking
   use it). Fail-open: if Redis is unreachable, requests are allowed.

`/api/health` reports `redis: ok | error: … | not_configured` so you can see
connectivity at a glance. The store serves fully without Redis.

## Provisioning (one-time, in Google Cloud)

1. Pick (or create) a GCP project and enable the **Redis API**:
   `gcloud services enable redis.googleapis.com`
2. Create a Basic tier instance (cheapest, fine for a cache; upgrade to
   Standard/HA if you want a replicated failover):
   ```bash
   gcloud redis instances create westhome-cache \
     --size=1 --region=asia-south1 --tier=BASIC \
     --redis-version=redis_7_0
   ```
   - Choose the region closest to your shoppers/origin (the store's DB is on
     Supabase; asia-south1 (Mumbai) matches Indian traffic).
   - `--connect-mode=PRIVATE_SERVICE_ACCESS` requires a VPC the app cannot
     reach; instead use `--connect-mode=DIRECT_PEERING` **with a public IP**:
     add `--enable-auth` if you want a password (requires in-transit
     encryption, i.e. add `--transit-encryption-mode=SERVER_AUTHENTICATION`).
3. Authorize your origin IP under the instance's **Authorized networks** (the
   egress IP shown by `curl https://api.ipify.org` from the Freebuff sandbox
   is the deploy/build egress; your app instances may differ, so widen or use
   the auth-string route).
4. Note the **IP** and **port** from
   `gcloud redis instances describe westhome-cache --region=asia-south1
   --format="value(host,port)"`.
5. If you enabled auth, note the **auth string** (Redis `AUTH` password).

## Keys to add (Keys tab → Environment)

Add these to the sandbox environment and, for production behavior, to the
Freebuff deploy environment:

| Key | Value | Notes |
| --- | --- | --- |
| `MEMORYSTORE_HOST` | e.g. `10.0.0.3` or the public IP | Required — the Redis endpoint. Without it everything no-ops. |
| `MEMORYSTORE_PORT` | usually `6379` | Optional, defaults to 6379 |
| `MEMORYSTORE_PASSWORD` | the auth string | Only if you enabled `--enable-auth` |
| `MEMORYSTORE_TLS` | `1` | Only if you enabled in-transit encryption |

Never commit these values; the keys are secrets.

## Verifying

- `GET /api/health` → `"redis": "ok"` once configured.
- Rate limit a route rapidly (e.g. hammer `/api/orders/track`) and watch the
  429s — `src/lib/rate-limit.ts` routes through Redis when configured.
- `ioredis` is the client (`package.json`), with a 1s command timeout and
  fail-open error handling, so a Redis outage cannot take the store down.
