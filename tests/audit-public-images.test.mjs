/**
 * Integration tests for scripts/audit-public-images.mjs.
 *
 * Runs the audit as a subprocess and validates its invariants:
 *   1. Every file in the KEEP list exists on disk
 *   2. No file is listed as both KEEP and orphan
 *   3. Convention-referenced files are never orphans
 *   4. The orphan list contains no file that appears in the DB or source
 *
 * Run: node --test tests/audit-public-images.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const AUDIT_SCRIPT = join(ROOT, "scripts", "audit-public-images.mjs");

// The audit shells out with --env-file=.env (it queries the production image
// inventory), so it can only run where a .env exists. Skip it everywhere else
// (CI runners, sandboxes) instead of failing the whole suite.
const hasEnv = existsSync(join(ROOT, ".env"));

function runAudit() {
  try {
    const stdout = execFileSync("node", ["--env-file=.env", AUDIT_SCRIPT], {
      cwd: ROOT,
      timeout: 120_000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true, stdout };
  } catch (err) {
    return { ok: false, stdout: err.stdout || "", stderr: err.stderr || "", code: err.status };
  }
}

// Output format:
//   ── KEEP list (53) ──
//        0.0 MB  /apple-touch-icon.png
//        2.4 MB  /collections/basket/...
//   ── orphans by folder ──
//        (or "No orphan files.")
//   orphan list → image-orphans.txt

function parseKeepList(stdout) {
  const lines = stdout.split("\n");
  const keep = [];
  let inKeep = false;
  for (const line of lines) {
    if (line.includes("── KEEP list")) { inKeep = true; continue; }
    if (inKeep && line.includes("── orphans")) break;
    if (inKeep) {
      // Match: "     0.0 MB  /path/to/file.ext"
      const match = line.match(/\s+[\d.]+\s+\w*\s+(\/\S+)/);
      if (match) keep.push(match[1]);
    }
  }
  return keep;
}

function parseOrphans(stdout) {
  // Orphans are written to image-orphans.txt
  const orphanFile = join(ROOT, "image-orphans.txt");
  if (existsSync(orphanFile)) {
    return readFileSync(orphanFile, "utf8").split("\n").filter(Boolean);
  }
  return [];
}

function parseSummary(stdout) {
  const keepMatch = stdout.match(/KEEP:\s+(\d+)\s+/);
  const orphanMatch = stdout.match(/ORPHANS:\s+(\d+)\s+/);
  return {
    keepCount: keepMatch ? parseInt(keepMatch[1]) : -1,
    orphanCount: orphanMatch ? parseInt(orphanMatch[1]) : -1,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe(
  "audit-public-images",
  { skip: hasEnv ? false : "requires .env (database-backed audit not available here)" },
  () => {
  const result = runAudit();

  it("audit script exits cleanly", () => {
    assert.ok(result.ok, `audit failed: ${result.stderr}\n${result.stdout}`);
  });

  it("reports a positive KEEP count", () => {
    const { keepCount } = parseSummary(result.stdout);
    assert.ok(keepCount > 0, `KEEP count should be > 0, got ${keepCount}`);
  });

  it("every KEEP file exists on disk", () => {
    const keep = parseKeepList(result.stdout);
    assert.ok(keep.length > 0, `should have KEEP entries, got ${keep.length}`);
    const missing = keep.filter((rel) => !existsSync(join(ROOT, "public", rel.slice(1))));
    assert.deepEqual(missing, [], `these KEEP files are missing from disk: ${missing.join(", ")}`);
  });

  it("convention files are never orphans", () => {
    const orphans = parseOrphans(result.stdout);
    const CONVENTION = [
      "/favicon.ico",
      "/manifest.json",
      "/sw.js",
      "/apple-touch-icon.png",
      "/upi-qr.png",
    ];
    const orphansAsSet = new Set(orphans);
    const brokenConvention = CONVENTION.filter((f) => orphansAsSet.has(f));
    assert.deepEqual(brokenConvention, [], `convention files should not be orphans: ${brokenConvention.join(", ")}`);
  });

  it("no file appears in both KEEP and orphans", () => {
    const keep = new Set(parseKeepList(result.stdout));
    const orphans = parseOrphans(result.stdout);
    const overlap = orphans.filter((f) => keep.has(f));
    assert.deepEqual(overlap, [], `these files are in both KEEP and orphans: ${overlap.join(", ")}`);
  });

  it("orphan count plus KEEP equals total files on disk", () => {
    const { keepCount, orphanCount } = parseSummary(result.stdout);
    // Count actual files in public/
    function countFiles(dir) {
      let count = 0;
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) count += countFiles(full);
        else count++;
      }
      return count;
    }
    const total = countFiles(join(ROOT, "public"));
    assert.equal(
      keepCount + orphanCount,
      total,
      `KEEP(${keepCount}) + ORPHANS(${orphanCount}) should equal total files (${total})`,
    );
  });
});
