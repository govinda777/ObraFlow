resource "neon_project" "obraflow" {
  name                      = "${var.project_name}-${var.environment}"
  database_name             = var.database_name
  region_id                 = var.region_id
  pg_version                = 16
  history_retention_seconds = var.history_retention_seconds
  store_password            = false
  branch = {
    name      = "main"
    protected = var.environment == "production"
  }

  primary_compute = {
    autoscaling_limit_min_cu = var.autoscaling_min_cu
    autoscaling_limit_max_cu = var.autoscaling_max_cu
    suspend_timeout_seconds  = 300
  }

  lifecycle {
    prevent_destroy = true
  }
}

# The Neon API/provider creates neon_superuser roles, so application access is
# provisioned through PostgreSQL SQL semantics with explicitly least privilege.
# This is a login role, not an owner/migration role. The secret is ephemeral and
# write-only; its value must also be delivered to the runtime secret store by
# the deployment secret-management workflow.
resource "postgresql_role" "obraflow_runtime" {
  count = var.manage_runtime_role ? 1 : 0

  name                      = "obraflow_runtime"
  login                     = true
  superuser                 = false
  create_database           = false
  create_role               = false
  replication               = false
  bypass_row_level_security = false
  inherit                   = true
  password_wo               = var.runtime_role_password
  password_wo_version       = var.runtime_role_password_version

  lifecycle {
    prevent_destroy = true
  }

  depends_on = [neon_project.obraflow]
}

# A separate login owns/applies versioned schema migrations. It is not used by
# the application and has no superuser, role-creation, database-creation, or
# RLS-bypass privileges. Its DDL rights are limited to this database/schema.
resource "postgresql_role" "obraflow_migrator" {
  count = var.manage_migration_role ? 1 : 0

  name                      = "obraflow_migrator"
  login                     = true
  superuser                 = false
  create_database           = false
  create_role               = false
  replication               = false
  bypass_row_level_security = false
  inherit                   = true
  connection_limit          = 2
  password_wo               = var.migration_role_password
  password_wo_version       = var.migration_role_password_version

  lifecycle {
    prevent_destroy = true
  }

  depends_on = [neon_project.obraflow]
}

# The migration runner creates the ledger, schema, functions, policies, and
# tables. SQL migrations grant only the required runtime access to those
# objects. Database CREATE is needed for CREATE SCHEMA; public CREATE is needed
# for the versioned baseline objects. No table/data grants are given here.
resource "postgresql_grant" "migrator_database" {
  count = var.manage_migration_role ? 1 : 0

  database    = var.database_name
  role        = postgresql_role.obraflow_migrator[0].name
  object_type = "database"
  privileges  = ["CONNECT", "CREATE"]
}

resource "postgresql_grant" "migrator_public_schema" {
  count = var.manage_migration_role ? 1 : 0

  database    = var.database_name
  role        = postgresql_role.obraflow_migrator[0].name
  schema      = "public"
  object_type = "schema"
  privileges  = ["USAGE", "CREATE"]
}
