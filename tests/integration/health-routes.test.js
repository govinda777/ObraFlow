import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { randomBytes } from "node:crypto";
import test from "node:test";

const STARTUP_ATTEMPTS = 40;
const STARTUP_DELAY_MS = 250;

async function getAvailablePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not reserve a local test port");
  }
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForServer(child, url, getOutput) {
  for (let attempt = 0; attempt < STARTUP_ATTEMPTS; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js exited before becoming ready: ${getOutput()}`);
    }

    try {
      const response = await fetch(`${url}/api/health`);
      if (response.status === 200) return;
    } catch {
      // The server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, STARTUP_DELAY_MS));
  }

  throw new Error(`Next.js did not become ready: ${getOutput()}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  const exited = once(child, "exit").then(() => true);
  const timedOut = new Promise((resolve) => setTimeout(() => resolve(false), 3000));
  if (!(await Promise.race([exited, timedOut]))) {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
}

test("production health routes are minimal, protected, and fail closed", async () => {
  const port = await getAvailablePort();
  const token = randomBytes(32).toString("hex");
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: { ...process.env, HEALTHCHECK_TOKEN: token, DATABASE_URL: "" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let output = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { output = `${output}${chunk}`.slice(-4000); });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { output = `${output}${chunk}`.slice(-4000); });

  try {
    await waitForServer(child, url, () => output);

    const liveness = await fetch(`${url}/api/health`);
    assert.equal(liveness.status, 200);
    assert.deepEqual(await liveness.json(), { status: "ok" });
    assert.equal(liveness.headers.get("x-frame-options"), "DENY");
    assert.equal(liveness.headers.get("x-content-type-options"), "nosniff");

    const unauthenticatedReadiness = await fetch(`${url}/api/ready`);
    assert.equal(unauthenticatedReadiness.status, 404);
    assert.equal(await unauthenticatedReadiness.text(), "");

    const unavailableReadiness = await fetch(`${url}/api/ready`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(unavailableReadiness.status, 503);
    assert.deepEqual(await unavailableReadiness.json(), { status: "not_ready" });
  } finally {
    await stopServer(child);
  }
});
