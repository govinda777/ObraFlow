output "project_id" {
  description = "Neon project ID. This is an identifier, not a credential."
  value       = neon_project.obraflow.id
}

output "default_branch_id" {
  description = "Neon's protected production root branch or the environment's isolated root branch."
  value       = neon_project.obraflow.branch.id
}

output "default_endpoint_id" {
  description = "Default read-write endpoint ID. No database password or connection URI is output."
  value       = neon_project.obraflow.primary_compute.id
}

output "database_host" {
  description = "Default direct read-write endpoint hostname; not a credential. Use the direct endpoint for migrations and IaC role management."
  value       = neon_project.obraflow.primary_compute.host
}

output "database_host_pooler" {
  description = "Default read-write endpoint hostname through Neon's connection pooler. Use only for the serverless application runtime."
  value       = neon_project.obraflow.primary_compute.host_pooler
}

output "database_name" {
  description = "Default database name."
  value       = neon_project.obraflow.database_name
}

output "runtime_role_name" {
  description = "Least-privilege application role managed by PostgreSQL provider, or null until the second-stage role setup is enabled."
  value       = var.manage_runtime_role ? postgresql_role.obraflow_runtime[0].name : null
}

output "migration_role_name" {
  description = "Separate schema migration login managed by OpenTofu, or null until the role setup is enabled."
  value       = var.manage_migration_role ? postgresql_role.obraflow_migrator[0].name : null
}
