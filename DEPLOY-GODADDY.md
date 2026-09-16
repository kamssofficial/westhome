# Deploying Westhome on GoDaddy (moving off Vercel)

The site currently returns `402 Payment Required / DEPLOYMENT_DISABLED` on Vercel, which
means Vercel has paused the deployment at the account level. This document is the path to
hosting it on GoDaddy instead.

**Before you start:** un-pausing Vercel (add a payment method, upgrade, or contact
`vercel.com/help`) is a five-minute fix, while this migration is a half-day job. They are
not mutually exclusive — un-pausing gets the store back online today, and you can migrate
deliberately afterwards without the shop being dark.

---

## 1. What moves and what does not

| Piece | Where it lives now | After the move |
| --- | --- | --- |
| Next.js app (storefront + admin + API) | Vercel | GoDaddy |
| Database (Postgres) | Supabase (`*.pooler.supabase.com`) | **Unchanged** — nothing to migrate |
| Product/media files | Google Drive + `public/` in git | **Unchanged** |
| Domain + DNS | GoDaddy (`ns69/ns70.domaincontrol.com`) | GoDaddy, records repointed to the server |

Only the Node process moves. That keeps this far smaller than a typical host migration:
there is no database dump to restore and no media to re-upload.

---

## 2. Find out which GoDaddy product you have

Sign in at godaddy.com → **My Products**. Then:

| What you see | Can it run this app? |
| --- | --- |
| **VPS** (Linux, root/SSH) | ✅ Yes — use **Path A**. This is the only plan that runs the app exactly as it runs now. |
| **Web Hosting Plus / cPanel** with a **Node.js version ≥ 20.9** in *Setup Node.js App* | ⚠️ Usually yes — use **Path B**, with caveats. |
| **Shared hosting (Economy/Deluxe)** with no Node selector, or only Node 18 | ❌ No — Next.js 16 will not start. Use Path A, or keep Vercel for the app. |
| Only **Domains** | ❌ You need to buy hosting first. A VPS is the right tier for this app. |

Also worth knowing: a GoDaddy VPS is the only plan where you get root, so it is the only
one where normal Next.js operations (rebuild, restart, logs, HTTPS via certbot) are
straightforward. If you are buying, buy that rather than shared hosting.

---

## 3. Path A — GoDaddy VPS (recommended)

Assumes Ubuntu 22.04/24.04 with root SSH access.

```bash
# 1. Runtime: Node 22 (Next.js 16 requires >= 20.9)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git nginx
node -v && npm -v

# 2. Code
mkdir -p /var/www && cd /var/www
git clone https://github.com/salmansahil2005/westhome.git
cd westhome

# 3. Secrets — copy the SAME values the Vercel project uses.
#    Vercel dashboard > Project > Settings > Environment Variables.
#    The preflight script checks every required one below.
nano .env.production

# 4. Build a self-contained server bundle
npm ci
NEXT_OUTPUT_MODE=standalone npm run build

# 5. The standalone bundle does not copy these automatically
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# 6. Verify before exposing it
node scripts/godaddy-deploy-check.mjs

# 7. Smoke test on the loopback interface
PORT=3000 node .next/standalone/server.js &
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/login   # expect 200
kill %1
```

### Keep it running with systemd

`/etc/systemd/system/westhome.service`:

```ini
[Unit]
Description=Westhome (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/westhome
EnvironmentFile=/var/www/westhome/.env.production
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /var/www/westhome/.next/standalone/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
chown -R www-data:www-data /var/www/westhome
systemctl daemon-reload && systemctl enable --now westhome
systemctl status westhome --no-pager        # logs: journalctl -u westhome -f
```

### Reverse proxy and HTTPS

`/etc/nginx/sites-available/westhome`:

```nginx
server {
    listen 80;
    server_name westhome.in www.westhome.in;

    client_max_body_size 12m;          # admin image uploads (MAX_FILE_SIZE is 5 MB)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
ln -s /etc/nginx/sites-available/westhome /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d westhome.in -d www.westhome.in     # auto-renews
ufw allow 22,80,443/tcp && ufw enable
```

---

## 4. Path B — cPanel "Setup Node.js App"

1. cPanel → **Setup Node.js App** → *Create Application*.
2. **Application root**: `westhome` · **Application URL**: `westhome.in` ·
   **Startup file**: `.next/standalone/server.js`.
3. **Node.js version**: must be **20.9 or newer**. If the newest offered is 18, stop —
   this app will not boot, and you need Path A.
4. Add every variable from section 5 through the *Environment Variables* UI.
5. SSH in (or use cPanel's terminal), then build inside the application root:

   ```bash
   npm ci
   NEXT_OUTPUT_MODE=standalone npm run build
   cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
   node scripts/godaddy-deploy-check.mjs
   ```

6. **Restart** the application in the cPanel UI.

Caveats on this path: the app must bind to the port cPanel assigns (the standalone server
honours `PORT`, which cPanel sets), Passenger restarts are manual after each deploy, and
the "Run NPM Install" button in the UI is not enough on its own — the build step above is
required. It works, but Path A is less fragile.

---

## 5. Environment variables to carry over

Copy the values from Vercel → Project → Settings → Environment Variables; these are the
ones the app reads (`npm run deploy:check` verifies them on the server):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Supabase pooler URL — copy exactly, including `?pgbouncer=true`-style params |
| `NEXTAUTH_SECRET` | Must match the current value or every existing login session is invalidated |
| `NEXTAUTH_URL` | `https://westhome.in` — a `localhost` value here breaks sign-in |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Live keys to keep taking payments |
| `NEXT_PUBLIC_APP_URL` | `https://westhome.in` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_APP_NAME` | Storefront contact/config |
| `UPLOAD_DIR`, `MAX_FILE_SIZE` | `public/uploads`, `5242880` |
| `GOOGLE_OAUTH_CLIENT_ID` / `_CLIENT_SECRET` / `_REFRESH_TOKEN` (or `GOOGLE_CREDENTIALS_JSON`) | Needed for admin uploads to reach Google Drive; without these, uploads fall back to local disk |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Optional, same as Vercel |

**Build-time gotcha:** `NEXT_PUBLIC_*` values are baked into the client bundle during
`npm run build`. Set them *before* building — changing them later has no effect until the
next rebuild.

---

## 6. Switch DNS (and how to roll back)

DNS lives at GoDaddy, so this is a record edit, not a transfer. Current values, for
rollback:

| Type | Name | Current value (Vercel) |
| --- | --- | --- |
| `A` | `@` | `216.198.79.1` |
| `CNAME` | `www` | `54711bde4adafc12.vercel-dns-017.com` |

GoDaddy → **DNS** → change `@` to your server's public IP and `www` to point at the same
IP (an `A` record, or a `CNAME` to `@`). Keep TTL low (600 s) on the day of the switch.
Rolling back is restoring those two rows exactly as above — that is the fastest undo if
anything is wrong.

Wait for propagation, then:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://westhome.in/            # 200, not 402
curl -sS -o /dev/null -w "%{http_code}\n" https://westhome.in/api/products?limit=1
```

Then click through, signed in as admin: homepage images, a product page, **sign-in**,
**add to cart → checkout**, a test **Razorpay payment**, an **admin upload**, and the
admin dashboard's **Live Store**. Sign-in and payments are the two flows most sensitive to
a host change, so test those explicitly.

---

## 7. Everyday deploys afterwards

GoDaddy has no git-push auto-deploy, so a release is:

```bash
cd /var/www/westhome
git pull
npm ci
NEXT_OUTPUT_MODE=standalone npm run build
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
systemctl restart westhome
```

A short `deploy.sh` with those six lines (plus `set -e`) is worth creating on the server.

---

## 8. Two things the move does not fix

1. **Image weight.** `public/` holds ~720 MB of full-size PNGs (many 2.5–3.5 MB) and the
   app serves them unoptimized. On GoDaddy that becomes your bandwidth bill instead of
   Vercel's allowance — the same traffic pattern that triggered the pause will still be
   expensive. Shrinking those images is the real fix, independent of host.
2. **Keeping Supabase and Drive.** Both are still external dependencies after the move.
   That is deliberate (it is what makes this migration cheap), but it means the app is
   still not fully self-hosted unless those are moved too.
