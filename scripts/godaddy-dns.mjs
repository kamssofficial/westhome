// GoDaddy DNS helper for the westhome.in → Freebuff cutover.
//
// Usage:
//   node scripts/godaddy-dns.mjs list                     # print A/CNAME/TXT/MX for @ and www
//   node scripts/godaddy-dns.mjs backup                   # write godaddy-zone-backup.json
//   node scripts/godaddy-dns.mjs put <type> <name> <json> # replace records, e.g.
//         node scripts/godaddy-dns.mjs put A @ '[{"data":"216.150.16.1","ttl":600}]'
//
// Auth: reads GODADDY_API_KEY from the environment (never printed).
// Accepts either a Personal Access Token (gd_pat_…) or the classic key:secret pair.

const DOMAIN = "westhome.in";
const API = `https://api.godaddy.com/v2/domains/${DOMAIN}/records`;

const key = process.env.GODADDY_API_KEY;
if (!key) {
  console.error("GODADDY_API_KEY is not set (add it to .env.local).");
  process.exit(1);
}

// PATs are sent as "sso-key <token>"; classic keys as "sso-key <key>:<secret>".
// The classic form is detected by containing a colon; both variants are tried otherwise.
const candidates = key.includes(":")
  ? [`sso-key ${key}`]
  : [`sso-key ${key}`, `sso-key ${key}:${key}`];

async function api(path, init = {}) {
  let lastRes;
  for (const auth of candidates) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: auth, accept: "application/json", "content-type": "application/json", ...init.headers },
    });
    if (res.status !== 401 || candidates.length === 1) return res;
    lastRes = res;
  }
  return lastRes;
}

const [cmd, type, name, json] = process.argv.slice(2);

// Shorthand API calls used to diagnose 404s (which domains does this token see?).
if (cmd === "domains") {
  const res = await fetch("https://api.godaddy.com/v2/domains?limit=50", {
    headers: { Authorization: candidates[0], accept: "application/json" },
  });
  console.log("GET /v2/domains →", res.status);
  const body = await res.text();
  if (res.ok) console.log(JSON.parse(body).map((d) => d.domain).join("\n") || "(none)");
  else console.log(body.slice(0, 300));
  process.exit(0);
}

if (cmd === "list" || cmd === "backup") {
  const res = await api("");
  const body = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status}:`, body.slice(0, 400));
    process.exit(1);
  }
  const all = JSON.parse(body);
  const interesting = all.filter(
    (r) => ["A", "AAAA", "CNAME", "TXT", "MX"].includes(r.type) && ["@", "www"].includes(r.name),
  );
  console.log(`zone has ${all.length} records; showing A/AAAA/CNAME/TXT/MX for @ and www:`);
  console.log(JSON.stringify(interesting, null, 1));
  if (cmd === "backup") {
    const file = "godaddy-zone-backup.json";
    await import("node:fs/promises").then((fs) => fs.writeFile(file, JSON.stringify(all, null, 2)));
    console.log(`full zone backed up to ${file}`);
  }
} else if (cmd === "put") {
  if (!type || !name || !json) {
    console.error("usage: put <type> <name> <json-array-of-records>");
    process.exit(1);
  }
  const res = await api(`/${type}/${encodeURIComponent(name)}`, { method: "PUT", body: json });
  const body = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status}:`, body.slice(0, 400));
    process.exit(1);
  }
  console.log(`OK: ${type}/${name} replaced.`);
} else {
  console.error("usage: list | backup | put <type> <name> <json>");
  process.exit(1);
}
