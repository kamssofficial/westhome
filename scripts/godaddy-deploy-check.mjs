#!/usr/bin/env node
// Preflight check for a self-hosted deploy (GoDaddy VPS / cPanel Node app).
//
// Run this ON THE SERVER, from the project root, AFTER the build:
//
//   node scripts/godaddy-deploy-check.mjs      (or: npm run deploy:check)
//
// It checks the things that actually break a self-hosted move: the Node
// version, the runtime environment variables, database reachability (Supabase
// stays exactly where it is), media-storage configuration, the upload
// directory, and that the build output for your chosen output mode exists.
//
// Exit code 0 = safe to start. Exit code 1 = at least one FAIL to fix first.

import fs from "fs";
import path from "path";
import net from "net";

const results = [];
const add = (level, name, detail) => results.push({ level, name, detail });
const pass = (name, detail = "") => add("PASS", name, detail);
const warn = (name, detail = "") => add("WARN", name, detail);
const fail = (name, detail = "") => add("FAIL", name, detail);

// ── Load env files the way Next.js does (without overriding real env vars) ──
const ENV_FILES = [".env.production.local", ".env.local", ".env.production", ".env"];
function loadEnv() {
  const loaded = [];
  for (const file of ENV_FILES) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    loaded.push(file);
    for (const rawLine of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Strip trailing inline comment only when the value was not quoted.
      if (!rawLine.trim().slice(eq + 1).trim().startsWith('"')) {
        value = value.split(" #")[0].trim();
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
  return loaded;
}

// ── Node version ────────────────────────────────────────────────────────────
function checkNode() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  const ok = major > 20 || (major === 20 && minor >= 9);
  const detail = `running v${process.versions.node} (Next.js 16 needs >= 20.9)`;
  ok ? pass("Node version", detail) : fail("Node version", detail);
}

// ── Environment variables ───────────────────────────────────────────────────
function checkEnv(loadedFiles) {
  if (loadedFiles.length === 0) {
    warn("Env files", "none found (.env, .env.production…) — using the process environment");
  } else {
    pass("Env files", `loaded ${loadedFiles.join(", ")}`);
  }

  for (const key of ["DATABASE_URL", "NEXTAUTH_SECRET", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]) {
    process.env[key] ? pass(`env ${key}`, "set") : fail(`env ${key}`, "missing — the app will not work without it");
  }

  const publicUrl = process.env.NEXTAUTH_URL || "";
  if (!publicUrl) {
    fail("env NEXTAUTH_URL", "missing — sign-in redirects will break");
  } else if (/localhost|127\.0\.0\.1/.test(publicUrl)) {
    fail("env NEXTAUTH_URL", `${publicUrl} — must be the public https URL (https://www.westhome.in)`);
  } else if (!publicUrl.startsWith("https://")) {
    warn("env NEXTAUTH_URL", `${publicUrl} — production should use https://`);
  } else {
    pass("env NEXTAUTH_URL", publicUrl);
  }

  // NEXT_PUBLIC_* values are baked into the client bundle at build time, so a
  // value only present at runtime has no effect on an already-built app.
  for (const key of ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_WHATSAPP_NUMBER"]) {
    process.env[key] ? pass(`env ${key}`, "set (build-time value)") : warn(`env ${key}`, "unset — set it before building");
  }

  const hasDrive =
    (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_REFRESH_TOKEN) ||
    process.env.GOOGLE_CREDENTIALS_JSON ||
    process.env.GOOGLE_CREDENTIALS_PATH;
  hasDrive
    ? pass("Media storage", "Google Drive credentials present")
    : warn(
        "Media storage",
        "no Google Drive credentials — admin uploads will write to the local disk (UPLOAD_DIR) instead of Drive",
      );
}

// ── Database (Supabase) ─────────────────────────────────────────────────────
async function checkDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  let pg;
  try {
    pg = (await import("pg")).default;
  } catch {
    warn("Database", "pg module not installed — skipping the connectivity check");
    return;
  }
  const parsed = new URL(url);
  const client = new pg.Client({
    connectionString: url,
    ssl: url.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM "Product"');
    pass("Database", `connected to ${parsed.hostname}:${parsed.port || 5432} — ${rows[0].n} products visible`);
  } catch (err) {
    fail("Database", `${parsed.hostname} unreachable: ${err.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

// ── Upload directory ────────────────────────────────────────────────────────
function checkUploadDir() {
  const dir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "public/uploads");
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    pass("Upload directory", `${dir} is writable`);
  } catch (err) {
    fail("Upload directory", `${dir} not writable: ${err.message}`);
  }
}

// ── Build output ────────────────────────────────────────────────────────────
function checkBuildOutput() {
  const standaloneExpected = process.env.NEXT_OUTPUT_MODE === "standalone";
  const standaloneServer = path.join(process.cwd(), ".next", "standalone", "server.js");
  const buildId = path.join(process.cwd(), ".next", "BUILD_ID");

  if (!fs.existsSync(buildId)) {
    fail("Build output", "no .next/BUILD_ID — run the build first (see DEPLOY-GODADDY.md)");
    return;
  }
  if (standaloneExpected) {
    fs.existsSync(standaloneServer)
      ? pass("Build output", ".next/standalone/server.js present")
      : fail(
          "Build output",
          "NEXT_OUTPUT_MODE=standalone but .next/standalone/server.js is missing — rebuild with that variable set",
        );
  } else {
    pass("Build output", ".next/BUILD_ID present (default output mode)");
  }

  // The standalone bundle does not copy public/ or .next/static automatically.
  if (standaloneExpected) {
    for (const rel of ["public", path.join(".next", "static")]) {
      const target = path.join(process.cwd(), ".next", "standalone", rel);
      fs.existsSync(target)
        ? pass(`standalone ${rel}`, "copied")
        : warn(
            `standalone ${rel}`,
            `missing at .next/standalone/${rel} — cp -r it there or images and CSS will 404`,
          );
    }
  }
}

// ── Port ────────────────────────────────────────────────────────────────────
async function checkPort() {
  // PORT is sometimes exported as 0 meaning "let the OS pick" — that is not a
  // usable production port, so fall back to the default the app actually uses.
  const rawPort = Number(process.env.PORT);
  const port = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 3000;
  await new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        warn("Port", `${port} is already in use — fine if that is this app; otherwise set PORT`);
      } else {
        warn("Port", `${port}: ${err.message}`);
      }
      resolve();
    });
    server.once("listening", () => {
      server.close(() => {
        pass("Port", `${port} is free`);
        resolve();
      });
    });
    server.listen(port, "0.0.0.0");
  });
}

// ── Report ──────────────────────────────────────────────────────────────────
const loadedFiles = loadEnv();
checkNode();
checkEnv(loadedFiles);
await checkDatabase();
checkUploadDir();
checkBuildOutput();
await checkPort();

const icon = { PASS: "✓", WARN: "!", FAIL: "✗" };
console.log("\n  westhome — deploy preflight\n");
for (const { level, name, detail } of results) {
  console.log(`  ${icon[level]} ${name.padEnd(22)} ${detail}`);
}
const failures = results.filter((r) => r.level === "FAIL").length;
const warnings = results.filter((r) => r.level === "WARN").length;
console.log(
  `\n  ${failures === 0 ? "Ready to start." : `${failures} blocker(s) must be fixed.`}` +
    (warnings ? ` ${warnings} warning(s).` : "") +
    "\n",
);
process.exit(failures === 0 ? 0 : 1);
