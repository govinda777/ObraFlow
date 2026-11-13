import assert from "node:assert/strict";
import { Given, When, Then } from "@cucumber/cucumber";
import {
  authorizeHealthCheck,
  evaluateReadiness,
  getLivenessPayload,
} from "../../../src/lib/health.js";

const HEALTH_TOKEN = "bdd-health-token";

When("the liveness payload is requested", function () {
  this.payload = getLivenessPayload();
});

Then("the service status is {string}", function (status) {
  assert.equal(this.payload.status, status);
  assert.deepEqual(Object.keys(this.payload), ["status"]);
});

Given("the health monitor has a valid token", function () {
  this.authorizationHeader = `Bearer ${HEALTH_TOKEN}`;
});

Given("the health monitor has no valid token", function () {
  this.authorizationHeader = "Bearer invalid-token";
});

Given("the database dependency is available", function () {
  this.checkDatabase = async () => {};
});

Given("the database dependency is unavailable", function () {
  this.checkDatabase = async () => {
    throw new Error("database credentials or host must not appear in response");
  };
});

When("the readiness check runs", async function () {
  assert.equal(
    authorizeHealthCheck(this.authorizationHeader, HEALTH_TOKEN),
    true,
  );
  this.result = await evaluateReadiness(this.checkDatabase);
});

Then("the readiness response is {int} with status {string}", function (statusCode, status) {
  assert.equal(this.result.statusCode, statusCode);
  assert.equal(this.result.body.status, status);
  assert.equal(JSON.stringify(this.result).includes("credentials"), false);
});

When("the readiness endpoint authorization is checked", function () {
  this.authorized = authorizeHealthCheck(this.authorizationHeader, HEALTH_TOKEN);
});

Then("the monitor is denied", function () {
  assert.equal(this.authorized, false);
});
