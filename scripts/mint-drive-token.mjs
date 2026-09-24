#!/usr/bin/env node
/**
 * Mint a Google Drive refresh token for the media backend.
 *
 * Production stores uploads on Google Drive through an OAuth trio
 * (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET /
 * GOOGLE_OAUTH_REFRESH_TOKEN) that lives in the deploy environment, never in
 * this repo. The refresh token has to be re-minted whenever it dies, and it
 * dies on its own: an OAuth client whose consent screen is still in "Testing"
 * is issued refresh tokens that expire after 7 days. That failure is quiet —
 * the storefront keeps serving, and only image uploads stop working — which is
 * why .github/workflows/storage-health.yml watches for it.
 *
 * Usage:
 *   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... npm run drive:token
 *   npm run drive:token -- --credentials path/to/installed-client.json
 *
 * The client JSON is the "installed" (desktop) client downloaded from Google
 * Cloud Console → Clients; this project's own copy lives outside the repo.
 * The script prints the consent URL, captures the redirect on loopback, and
 * prints the refresh token. Paste that value into the Freebuff project's
 * Production environment variables and redeploy. Do not commit it.
 *
 * Flags:
 *   --credentials <path>  read client_id/client_secret from an installed-app JSON
 *                         (default: env vars)
 *   --port <n>            loopback port (default 8777)
 *   --scope <url>         override the scope (default full Drive)
 */
import http from "node:http";
import fs from "node:fs";

const DEFAULT_SCOPE = "https://www.googleapis.com/auth/drive";

const USAGE = `Mint a Google Drive refresh token for the deployment's media storage.

  GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... npm run drive:token
  npm run drive:token -- --credentials path/to/installed-client.json

Flags:
  --credentials <path>  installed-app client JSON (default: GOOGLE_OAUTH_* env vars)
  --port <n>            loopback port (default 8777)
  --scope <url>         scope to request (default: full Drive)
`;

function parseArgs(argv) {
  const args = { port: 8777, scope: DEFAULT_SCOPE, credentials: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--credentials") args.credentials = argv[++i];
    else if (a === "--port") args.port = Number(argv[++i]);
    else if (a === "--scope") args.scope = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(USAGE);
  process.exit(0);
}

function loadClient({ credentials, clientId, clientSecret }) {
  if (credentials) {
    const parsed = JSON.parse(fs.readFileSync(credentials, "utf8"));
    const key = parsed.installed || parsed.web;
    if (!key?.client_id || !key?.client_secret) {
      throw new Error(`${credentials} has no installed/web client_id + client_secret`);
    }
    return { clientId: key.client_id, clientSecret: key.client_secret };
  }
  if (!clientId || !clientSecret) {
    throw new Error(
      "No OAuth client: set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET, or pass --credentials <installed-client.json>",
    );
  }
  return { clientId, clientSecret };
}

let clientId;
let clientSecret;
try {
  ({ clientId, clientSecret } = loadClient({
    credentials: args.credentials,
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  }));
} catch (err) {
  // An ops tool: say what to fix, not where it was thrown.
  console.error(err.message);
  console.error(`\n${USAGE}`);
  process.exit(1);
}

const redirectUri = `http://127.0.0.1:${args.port}/`;
const consentUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: args.scope,
    access_type: "offline",
    prompt: "consent",
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (!code && !error) {
    res.writeHead(404).end("not the oauth callback");
    return;
  }

  if (error) {
    res.writeHead(200, { "content-type": "text/html" }).end(`<h2>Consent failed: ${error}</h2>`);
    console.error(`\nConsent failed: ${error}`);
    finish(1);
    return;
  }

  res
    .writeHead(200, { "content-type": "text/html" })
    .end("<h2>Done — the refresh token is in your terminal.</h2>");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.refresh_token) {
      console.error(`\nNo refresh_token in the response (${Object.keys(tokens).join(", ")}).`);
      console.error("Revoke the app's existing access and retry: the flow must run with prompt=consent.");
      finish(1);
      return;
    }

    // Prove the credential works and report whether it will last.
    const probe = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: { authorization: "Bearer " + tokens.access_token },
    });
    const account = probe.ok ? (await probe.json()).user?.emailAddress : null;

    console.log("\nGOOGLE_OAUTH_REFRESH_TOKEN=" + tokens.refresh_token);
    console.log(`\n# scope: ${tokens.scope}`);
    console.log(`# account: ${account ?? "could not verify (token issued anyway)"}`);
    if (tokens.refresh_token_expires_in) {
      const days = (tokens.refresh_token_expires_in / 86400).toFixed(1);
      console.log(
        `# WARNING: this token expires in ${days} days — the OAuth client's consent screen is` +
          " still in 'Testing'. Publish the app (Google Auth Platform → Audience) to remove that limit.",
      );
    } else {
      console.log("# no expiry reported — this token does not expire on the 7-day Testing clock.");
    }
    finish(0);
  } catch (err) {
    console.error("\nToken exchange failed:", err.message);
    finish(1);
  }
});

let closed = false;
function finish(code) {
  if (closed) return;
  closed = true;
  server.close(() => process.exit(code));
  setTimeout(() => process.exit(code), 500).unref();
}

server.on("error", (err) => {
  console.error(`Cannot listen on 127.0.0.1:${args.port} — ${err.message}`);
  process.exit(1);
});

server.listen(args.port, "127.0.0.1", () => {
  console.log("Open this URL and approve Drive access:\n");
  console.log(consentUrl + "\n");
  console.log(`Waiting for the redirect on ${redirectUri} ...`);
});

setTimeout(() => {
  console.error("\nTimed out after 20 minutes with no consent.");
  finish(1);
}, 20 * 60 * 1000).unref();
