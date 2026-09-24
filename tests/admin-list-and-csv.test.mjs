/**
 * Tests for the admin list/export behaviour behind two reported bugs:
 * duplicate rows appearing in the product list's infinite scroll, and CSV
 * exports failing (or silently producing corrupt files).
 *
 * The logic lives in dependency-free modules precisely so it can be run here
 * without a DOM or a browser test harness.
 *
 * Run: node --test tests/admin-list-and-csv.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { toCsv, csvField, csvHeaders } = await import("../src/lib/csv.ts");
const { mergeProductPage } = await import("../src/lib/mergeProductPage.ts");

describe("CSV export — field escaping", () => {
  it("always quotes, so commas cannot shift columns", () => {
    assert.equal(csvField("Rao, Ananya"), '"Rao, Ananya"');
  });

  it("doubles inner quotes, per RFC 4180", () => {
    assert.equal(csvField('The "Walnut" Frame'), '"The ""Walnut"" Frame"');
  });

  it("keeps embedded newlines inside the quoted field", () => {
    const out = csvField("line one\nline two");
    assert.equal(out, '"line one\nline two"');
    // Splitting the raw text on newlines yields two segments; the quotes are
    // what stop a spreadsheet from treating that as two separate records.
    assert.equal(out.split("\n").length, 2);
  });

  it("renders null and undefined as an empty quoted field", () => {
    assert.equal(csvField(null), '""');
    assert.equal(csvField(undefined), '""');
    assert.equal(csvField(0), '"0"');
    assert.equal(csvField(false), '"false"');
  });
});

describe("CSV export — document shape", () => {
  it("returns an empty string for no rows (the caller reports 'nothing to export')", () => {
    assert.equal(toCsv([]), "");
  });

  it("uses the first row's scalar keys as the header, in order", () => {
    const csv = toCsv([{ orderNumber: "WH-1", total: 100 }]);
    assert.equal(csv.split("\r\n")[0], "orderNumber,total");
  });

  it("skips object-valued fields rather than emitting [object Object]", () => {
    // Prisma returns nested relations and Decimal/Date instances here.
    const csv = toCsv([
      { id: "1", name: "Frame", total: 1200, customer: { name: "Ananya" }, placedAt: new Date(0) },
    ]);
    assert.equal(csv.split("\r\n")[0], "id,name,total");
    assert.ok(!csv.includes("[object Object]"));
  });

  it("writes one CRLF-delimited line per row, fully quoted", () => {
    const csv = toCsv([
      { orderNumber: "WH-1", customer: "Rao, Ananya" },
      { orderNumber: "WH-2", customer: 'The "Oak" Set' },
    ]);
    const lines = csv.split("\r\n");
    assert.equal(lines.length, 3);
    assert.equal(lines[0], "orderNumber,customer");
    assert.equal(lines[1], '"WH-1","Rao, Ananya"');
    assert.equal(lines[2], '"WH-2","The ""Oak"" Set"');
  });

  it("keeps the column count stable when a later row has extra keys", () => {
    // Header is fixed by row 0; a ragged row must still produce a valid
    // (short) row rather than silently adding a column.
    const csv = toCsv([{ a: 1 }, { a: 2, b: 3 }]);
    const lines = csv.split("\r\n");
    assert.equal(lines[0], "a");
    assert.equal(lines[2], '"2"');
  });

  it("derives headers from the first row only", () => {
    assert.deepEqual(csvHeaders([{ a: 1, b: 2 }]), ["a", "b"]);
    assert.deepEqual(csvHeaders([]), []);
  });
});

describe("Infinite scroll — page merge", () => {
  const page1 = [{ id: "a" }, { id: "b" }];
  const page2 = [{ id: "c" }, { id: "d" }];

  it("appends the next page in order", () => {
    assert.deepEqual(
      mergeProductPage(page1, page2).map((r) => r.id),
      ["a", "b", "c", "d"]
    );
  });

  it("replaces the list on a fresh query (first page)", () => {
    const merged = mergeProductPage(page1, [{ id: "z" }], true);
    assert.deepEqual(merged.map((r) => r.id), ["z"]);
  });

  it("de-duplicates a first page that repeats a row", () => {
    // replace mode must still clean the page it installs.
    const merged = mergeProductPage(page1, [{ id: "z" }, { id: "z" }], true);
    assert.deepEqual(merged.map((r) => r.id), ["z"]);
  });

  it("drops rows already on screen — the duplicate-product bug", () => {
    // A retried request, or an observer firing twice before the loading flag
    // settles, resends the same page.
    const merged = mergeProductPage(page1, page2);
    const replayed = mergeProductPage(merged, page2);
    assert.deepEqual(replayed.map((r) => r.id), ["a", "b", "c", "d"]);
  });

  it("de-duplicates within the incoming page itself", () => {
    const merged = mergeProductPage([], [{ id: "x" }, { id: "x" }, { id: "y" }]);
    assert.deepEqual(merged.map((r) => r.id), ["x", "y"]);
  });

  it("returns the same array when the page is entirely duplicates", () => {
    // Preserving identity avoids a pointless re-render of the whole list.
    const prev = [...page1, ...page2];
    assert.equal(mergeProductPage(prev, page2), prev);
  });

  it("tolerates a missing or malformed payload without throwing", () => {
    assert.deepEqual(mergeProductPage(page1, undefined).map((r) => r.id), ["a", "b"]);
    assert.deepEqual(mergeProductPage(page1, null).map((r) => r.id), ["a", "b"]);
    // Rows without a usable id are ignored rather than corrupting the list.
    const merged = mergeProductPage([], [null, { id: "ok" }, { name: "no id" }]);
    assert.deepEqual(merged.map((r) => r.id), ["ok"]);
  });

  it("preserves every field of a kept row, not just the id", () => {
    const merged = mergeProductPage([], [{ id: "a", name: "Frame", stock: 3 }]);
    assert.equal(merged[0].name, "Frame");
    assert.equal(merged[0].stock, 3);
  });
});
