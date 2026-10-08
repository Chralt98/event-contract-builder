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
