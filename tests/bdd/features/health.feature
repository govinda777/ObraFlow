@health
Feature: ObraFlow health endpoints
  The health endpoints let operators verify the service without exposing secrets
  or creating unauthenticated load against the database.

  Scenario: Liveness stays minimal and public
    When the liveness payload is requested
    Then the service status is "ok"

  Scenario: Readiness is available to an authorized monitor when Neon responds
    Given the health monitor has a valid token
    And the database dependency is available
    When the readiness check runs
    Then the readiness response is 200 with status "ready"

  Scenario: Readiness fails closed when Neon is unavailable
    Given the health monitor has a valid token
    And the database dependency is unavailable
    When the readiness check runs
    Then the readiness response is 503 with status "not_ready"

  Scenario: Unauthenticated monitors cannot access dependency checks
    Given the health monitor has no valid token
    When the readiness endpoint authorization is checked
    Then the monitor is denied
