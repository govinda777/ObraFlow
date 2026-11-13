import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeHealthCheck,
  evaluateReadiness,
  getLivenessPayload,
} from "../../src/lib/health.js";

test("liveness returns a minimal payload", () => {
  assert.deepEqual(getLivenessPayload(), { status: "ok" });
});

test("health-check authorization requires the configured bearer token", () => {
  assert.equal(authorizeHealthCheck("Bearer internal-token", "internal-token"), true);
  assert.equal(authorizeHealthCheck("Bearer wrong-token", "internal-token"), false);
  assert.equal(authorizeHealthCheck("internal-token", "internal-token"), false);
  assert.equal(authorizeHealthCheck(null, "internal-token"), false);
  assert.equal(authorizeHealthCheck("Bearer internal-token", undefined), false);
});

test("readiness reports ready only when all dependency checks pass", async () => {
  const result = await evaluateReadiness(async () => {});
  assert.deepEqual(result, { statusCode: 200, body: { status: "ready" } });
});

test("readiness fails closed and hides dependency errors", async () => {
  const result = await evaluateReadiness(async () => {
    throw new Error("connection string must not leak");
  });

  assert.deepEqual(result, { statusCode: 503, body: { status: "not_ready" } });
  assert.equal(JSON.stringify(result).includes("connection string"), false);
});
