/**
 * Contract tests for the hero-image panel and its API handler.
 *
 * The pair cannot be exercised end to end here: the handler needs a live
 * session and a database. But the two ends have to agree on the wire format,
 * and they stopped agreeing during the storage migration — the handler was
 * rewritten to read `request.json()` while HeroManager still posted multipart
 * form data, so publishing a hero image failed in production with nothing in
 * the suite catching it. These assertions pin both ends to the same format.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const ROUTE = "src/api-handlers/admin/hero-image/route.ts";
const PANEL = "src/components/admin/HeroManager.tsx";

const read = (path) => readFile(join(root, path), "utf8");

describe("hero image panel <-> handler contract", () => {
  it("the panel publishes the image as multipart form data", async () => {
    const panel = await read(PANEL);
    assert.match(panel, /new FormData\(\)/, "panel must build a FormData");
    assert.match(panel, /fd\.append\("file", previewFile\)/, "panel must append the file");
    assert.match(panel, /fd\.append\("position", position\)/, "panel must append the position");
    assert.match(
      panel,
      /fetch\("\/api\/admin\/hero-image", \{ method: "POST", body: fd \}\)/,
      "panel must POST the FormData to /api/admin/hero-image",
    );
  });

  it("the handler reads that form data and never expects a JSON file", async () => {
    const route = await read(ROUTE);
    // Scoped to POST — PATCH legitimately reads a JSON body.
    const post = route.slice(route.indexOf("export async function POST"), route.indexOf("// PATCH"));
    assert.match(post, /await request\.formData\(\)/, "POST must parse form data");
    assert.match(post, /formData\.get\("file"\)/, "POST must read the file field");
    assert.match(post, /formData\.get\("position"\)/, "POST must read the position field");
    assert.doesNotMatch(post, /request\.json\(\)/, "a JSON body cannot carry the image File");
  });

  it("uploads are validated from the bytes, not the declared content type", async () => {
    const route = await read(ROUTE);
    assert.match(route, /sniffImageType\(buffer\)/, "the file must be sniffed before it is stored");
  });

  it("the panel removes the hero with a bare DELETE", async () => {
    const panel = await read(PANEL);
    assert.match(panel, /fetch\("\/api\/admin\/hero-image", \{ method: "DELETE" \}\)/);
  });

  it("that bare DELETE is accepted, and keeps the image restorable", async () => {
    const route = await read(ROUTE);
    const panel = await read(PANEL);
    const del = route.slice(route.indexOf("export async function DELETE"));

    // No parameters to send, so the handler must not ask for any.
    assert.doesNotMatch(del, /searchParams/, "DELETE must not require query parameters");
    assert.doesNotMatch(del, /Missing fileId or url/, "DELETE must not reject a bare call");

    // The removed image goes to the top of history, and the panel offers
    // Restore on every history entry — so the handler must not purge the file.
    assert.match(del, /updatedHistory = \[active,/, "the removed hero must land in history");
    assert.match(del, /value: \{ images: updatedHistory as any \}/, "history must be persisted");
    assert.doesNotMatch(del, /deleteMedia\(/, "purging the file would break the Restore button");
    assert.match(panel, /handleRestore\(h\.url\)/, "the panel restores from history");
  });
});
