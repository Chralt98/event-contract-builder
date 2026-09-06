/**
 * Shared live reachability check for a resolution source URL. Proposal
 * preflight uses the final status to keep unverified URLs out of the visible
 * proposal, while submission uses it for an invisible per-source check and
 * emits only an aggregate warning. `z.url()` already guarantees the string is
 * a well-formed URL before this runs.
 */
export interface UrlCheckResult {
  /**
   * `ok` — resolved cleanly; `warn` — reachable but the server refused the
   * automated check (auth/bot wall/rate limit), so a human should verify;
   * `error` — the link did not resolve (HTTP error, DNS, refused, or timeout).
   */
  severity: "ok" | "warn" | "error";
  /** Final HTTP status, when a server returned one. */
  status?: number;
  /** Short human-readable status for rendering next to the URL. */
  label: string;
}

const DEFAULT_TIMEOUT_MS = 5000;
const USER_AGENT = "event-contract-builder/0.1 (source-reachability-check)";

async function request(
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT },
    });
  } finally {
    clearTimeout(timer);
  }
}

function isTimeout(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

/** Checks whether `url` currently resolves, without ever throwing. */
export async function checkUrl(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<UrlCheckResult> {
  let response: Response;
  try {
    response = await request(url, "HEAD", timeoutMs);
    // Some servers reject HEAD outright; fall back to GET before judging.
    if (response.status === 405 || response.status === 501) {
      response = await request(url, "GET", timeoutMs);
    }
  } catch (headErr) {
    if (isTimeout(headErr)) {
      return { severity: "error", label: "✗ unreachable (timeout)" };
    }
    // A socket-level HEAD failure can still succeed as a GET on some hosts.
    try {
      response = await request(url, "GET", timeoutMs);
    } catch (getErr) {
      return {
        severity: "error",
        label: isTimeout(getErr)
          ? "✗ unreachable (timeout)"
          : "✗ unreachable (connection failed)",
      };
    }
  }

  const { status, statusText } = response;
  if (status >= 200 && status < 400) {
    return { severity: "ok", status, label: `✓ ${status}` };
  }
  if (status === 401 || status === 403 || status === 429) {
    return {
      severity: "warn",
      status,
      label: `⚠ ${status} (blocked to automated checks; verify manually)`,
    };
  }
  return {
    severity: "error",
    status,
    label: `✗ ${status}${statusText ? ` ${statusText}` : ""}`,
  };
}
