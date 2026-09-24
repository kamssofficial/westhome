/**
 * Merge logic for the admin product list's infinite scroll.
 *
 * The list is appended page by page, and the append step is the one place
 * where a duplicate silently becomes permanent and visible: a retried request,
 * or a scroll that fires the observer again before the loading flag settles,
 * would otherwise render the same product twice. Out-of-order responses have
 * the mirror problem — an older page landing after a newer one.
 *
 * Dependency-free and side-effect free so the behaviour can be tested directly.
 */

export interface Identified {
  id: string;
}

function isIdentified(value: unknown): value is Identified {
  return !!value && typeof value === "object" && typeof (value as Identified).id === "string";
}

/**
 * Merge a freshly fetched page into the rows already on screen.
 *
 * @param prev     rows currently displayed
 * @param incoming rows just fetched
 * @param replace  true for the first page (filters changed / a fresh query),
 *                 which must discard the previous list entirely
 */
export function mergeProductPage<T extends Identified>(prev: T[], incoming: T[], replace = false): T[] {
  const next = Array.isArray(incoming) ? incoming.filter(isIdentified) : [];
  // De-duplicate within the page as well as against what is already on
  // screen. A single response can legitimately contain the same row twice —
  // an overlapping pagination window, or a join that duplicates a product
  // across categories — and those duplicates are just as visible as a
  // repeated request.
  const uniqueNext = replace ? dedupe(next) : appendUnique(prev, next);
  // Append nothing (and keep the existing array identity) when the page is
  // entirely duplicates, so a redundant fetch does not re-render the list.
  return uniqueNext === prev ? prev : uniqueNext;
}

function dedupe<T extends Identified>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function appendUnique<T extends Identified>(prev: T[], next: T[]): T[] {
  const seen = new Set(prev.map((row) => row.id));
  const fresh: T[] = [];
  for (const row of next) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    fresh.push(row);
  }
  return fresh.length ? [...prev, ...fresh] : prev;
}
