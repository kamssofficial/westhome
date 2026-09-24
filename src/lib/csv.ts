/**
 * CSV generation for admin exports.
 *
 * Dependency-free and side-effect free so the export path can be tested
 * directly. The interesting part is escaping: order rows, customer names and
 * notes routinely contain commas, quotes and newlines, and an unescaped value
 * silently shifts every column after it — producing a file that opens without
 * complaint and is quietly wrong.
 *
 * Built to RFC 4180: fields are always quoted, inner quotes are doubled, and
 * rows are CRLF-terminated.
 */

/** Escape a single field. Always quoted, so commas/newlines are safe. */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return '"' + String(value).replace(/"/g, '""') + '"';
}

/**
 * Which keys are exportable: object-valued fields (nested relations, Prisma
 * Decimal/Date instances) are skipped rather than stringified into
 * "[object Object]", and the first row defines the column order.
 */
export function csvHeaders(rows: Record<string, unknown>[]): string[] {
  const first = rows[0];
  if (!first) return [];
  return Object.keys(first).filter((key) => typeof first[key] !== "object");
}

/** Serialise rows to a CSV document. Returns "" for an empty row set. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = csvHeaders(rows);
  const esc = (row: Record<string, unknown>) =>
    headers.map((header) => csvField(row[header])).join(",");
  return [headers.join(","), ...rows.map(esc)].join("\r\n");
}
