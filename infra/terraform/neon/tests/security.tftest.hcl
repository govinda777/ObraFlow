mock_provider "neon" {}
mock_provider "postgresql" {}

variables {
  project_name              = "obraflow-test"
  database_name             = "obraflow_test"
  environment               = "development"
  region_id                 = "aws-us-east-1"
  history_retention_seconds = 86400
}

run "runtime_and_migration_roles_are_least_privilege" {
  command = plan

  variables {
    manage_runtime_role             = true
    runtime_role_password           = "runtime-test-password-not-a-secret-0001"
    manage_migration_role           = true
    migration_role_password         = "migration-test-password-not-a-secret-001"
    runtime_role_password_version   = "2"
    migration_role_password_version = "3"
  }

  assert {
    condition = (
      postgresql_role.obraflow_runtime[0].name == "obraflow_runtime" &&
      !postgresql_role.obraflow_runtime[0].superuser &&
      !postgresql_role.obraflow_runtime[0].create_database &&
      !postgresql_role.obraflow_runtime[0].create_role &&
      !postgresql_role.obraflow_runtime[0].replication &&
      !postgresql_role.obraflow_runtime[0].bypass_row_level_security
    )
    error_message = "The runtime role must remain a restricted login without DDL or RLS bypass privileges."
  }

  assert {
    condition = (
      postgresql_role.obraflow_migrator[0].name == "obraflow_migrator" &&
      !postgresql_role.obraflow_migrator[0].superuser &&
      !postgresql_role.obraflow_migrator[0].create_database &&
      !postgresql_role.obraflow_migrator[0].create_role &&
      !postgresql_role.obraflow_migrator[0].replication &&
      !postgresql_role.obraflow_migrator[0].bypass_row_level_security &&
      postgresql_role.obraflow_migrator[0].connection_limit == 2
    )
    error_message = "The migration role must be a separate restricted login with a low connection limit."
  }

  assert {
    condition = (
      toset(postgresql_grant.migrator_database[0].privileges) == toset(["CONNECT", "CREATE"]) &&
      toset(postgresql_grant.migrator_public_schema[0].privileges) == toset(["USAGE", "CREATE"])
    )
    error_message = "The migration role may receive only the declared database and public-schema grants."
  }
}

run "runtime_password_must_be_long_enough" {
  command = plan

  variables {
    manage_runtime_role   = true
    runtime_role_password = "too-short"
  }

  expect_failures = [var.runtime_role_password]
}

run "migration_password_must_be_long_enough" {
  command = plan

  variables {
    manage_migration_role   = true
    migration_role_password = "too-short"
  }

  expect_failures = [var.migration_role_password]
}
