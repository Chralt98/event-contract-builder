/**
 * Return a validation message when a source hierarchy does not have a fixed,
 * contiguous order beginning with a primary source at rank 1.
 */
export function sourceHierarchyRankError(
  sources: readonly { rank: number }[],
): string | undefined {
  const ranks = sources.map(({ rank }) => rank).sort((a, b) => a - b);
  if (!ranks.every((rank, index) => rank === index + 1)) {
    return `Source ranks must be unique and contiguous from 1; rank 1 is the primary and, when present, rank 2 is the fallback (got ${ranks.join(", ")}).`;
  }
  return undefined;
}

/**
 * Return a validation message when a hierarchy repeats the same source
 * agency or exact source URL. A different page, dataset, or mirror from the
 * same agency is not an independent fallback source.
 */
export function sourceIndependenceError(
  sources: readonly { publisher: string; url: string }[],
): string | undefined {
  const publishers = new Map<string, string>();
  for (const source of sources) {
    const key = normalizePublisher(source.publisher);
    const previous = publishers.get(key);
    if (previous) {
      return (
        `Resolution sources must use independent source agencies; publisher ` +
        `"${previous}" appears more than once. A second page, dataset, ` +
        `mirror, or re-publication from the same agency is not an independent ` +
        `fallback.`
      );
    }
    publishers.set(key, source.publisher.trim());
  }

  const urls = new Set<string>();
  for (const source of sources) {
    const key = normalizeUrl(source.url);
    if (urls.has(key)) {
      return (
        "Resolution sources must be independent and use unique URLs; the " +
        `source URL "${source.url}" is repeated.`
      );
    }
    urls.add(key);
  }

  return undefined;
}

function normalizePublisher(publisher: string): string {
  return publisher
    .trim()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(
      /\b(incorporated|inc|llc|ltd|limited|corp|corporation|company|co|gmbh|ag|plc)\b/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Explain the settlement risk of intentionally omitting a fallback source.
 * The warning is visible in proposal and registration responses while
 * remaining outside structuredContent, which echoes the input.
 */
export function singleSourceWarning(sourceCount: number): string | undefined {
  if (sourceCount !== 1) return undefined;
  return (
    "⚠ Warning: Only one resolution source is supplied. If the primary " +
    "source fails to report, becomes unavailable, or otherwise cannot be " +
    "used, the market will have no pre-approved fallback resolution source. " +
    "No independent fallback source was found or approved for this market. " +
    "Alternative: consider a nearby proxy or revised market question for " +
    "which at least two independent resolution sources can be named before " +
    "locking the market."
  );
}
