@tenant-isolation
Feature: Tenant and project isolation in PostgreSQL
  Row-level security must scope every query to an authenticated user, active
  tenant membership, and active project membership. Global profile values are
  not authorization grants.

  Scenario: An active project member sees only their tenant's project
    Given the tenant authorization database is migrated
    And the request is for user "usr_alpha_client" in tenant "tenant_legacy_usr_alpha_contractor"
    When the backend queries projects
    Then the visible project identifiers are "proj_alpha"

  Scenario: A forged tenant context does not grant access
    Given the tenant authorization database is migrated
    And the request is for user "usr_alpha_client" in tenant "tenant_legacy_usr_beta_contractor"
    When the backend queries projects
    Then no project is visible

  Scenario: A pending project membership does not grant access
    Given the tenant authorization database is migrated
    And the request is for user "usr_alpha_engineer" in tenant "tenant_legacy_usr_alpha_contractor"
    When the backend queries projects
    Then no project is visible

  Scenario: A legacy global role without membership grants no tenant access
    Given the tenant authorization database is migrated
    And the request is for user "usr_orphan_designer" in tenant "tenant_legacy_usr_alpha_contractor"
    When the backend queries projects
    Then no project is visible

  Scenario: Missing transaction context fails closed
    Given the tenant authorization database is migrated
    When the runtime role queries projects without request context
    Then no project is visible
