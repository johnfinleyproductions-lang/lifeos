/**
 * Finding journal entries by what they say.
 *
 * Plain and literal on purpose: every word typed has to appear somewhere in
 * the entry, in any order, whatever the capitals. No ranking and no fuzzy
 * matching, so a result is never a surprise.
 *
 * The matching runs on the server over the signed-in person's own entries.
 * Nothing about the search is stored.
 */

export type Searchable = {
  body: string;
  decisionSummary: string | null;
};

/** The words of a query, lower-cased, at most eight of them. */
export function queryWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
    .slice(0, 8);
}

export function matchesQuery(entry: Searchable, words: string[]): boolean {
  if (words.length === 0) return true;
  const haystack = `${entry.body}\n${entry.decisionSummary ?? ""}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * The part of a long entry worth showing for this search: a window around
 * the first place any of the words appears.
 */
export function excerptAround(text: string, words: string[], span = 420): string {
  if (text.length <= span) return text;
  const lower = text.toLowerCase();
  let first = -1;
  for (const word of words) {
    const at = lower.indexOf(word);
    if (at >= 0 && (first < 0 || at < first)) first = at;
  }
  if (first < 0) return text.slice(0, span) + "…";
  let start = Math.max(0, first - Math.floor(span / 3));
  // Start on a word, not in the middle of one.
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space >= 0 && space < first) start = space + 1;
  }
  const end = Math.min(text.length, start + span);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

/** Split text into runs, marking the ones that are a searched word. */
export function highlightParts(
  text: string,
  words: string[],
): Array<{ text: string; hit: boolean }> {
  if (words.length === 0 || text.length === 0) return [{ text, hit: false }];
  const escaped = words
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const wanted = new Set(words);
  return text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, hit: wanted.has(part.toLowerCase()) }));
}
