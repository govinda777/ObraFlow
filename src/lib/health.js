import { createHash, timingSafeEqual } from "node:crypto";

/** @returns {{ status: "ok" }} */
export function getLivenessPayload() {
  return { status: "ok" };
}

/**
 * Compare a health-check bearer token without comparing secret strings directly.
 * The endpoint remains unavailable unless a token is configured server-side.
 *
 * @param {string | null} authorizationHeader
 * @param {string | undefined} configuredToken
 * @returns {boolean}
 */
export function authorizeHealthCheck(authorizationHeader, configuredToken) {
  if (!authorizationHeader || !configuredToken) {
    return false;
  }

  const match = /^Bearer ([^\s]+)$/.exec(authorizationHeader);
  if (!match) {
    return false;
  }

  const suppliedDigest = createHash("sha256").update(match[1]).digest();
  const configuredDigest = createHash("sha256").update(configuredToken).digest();
  return timingSafeEqual(suppliedDigest, configuredDigest);
}

/**
 * Readiness intentionally returns no dependency details. The callback must
 * probe dependencies required to serve production traffic.
 *
 * @param {() => Promise<void>} checkDependencies
 * @returns {Promise<{
 *   statusCode: 200 | 503,
 *   body: { status: "ready" | "not_ready" }
 * }>}
 */
export async function evaluateReadiness(checkDependencies) {
  try {
    await checkDependencies();
    return { statusCode: 200, body: { status: "ready" } };
  } catch {
    return { statusCode: 503, body: { status: "not_ready" } };
  }
}
