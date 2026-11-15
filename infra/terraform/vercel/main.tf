resource "vercel_project" "obraflow" {
  name      = var.project_name
  team_id   = var.team_id
  framework = "nextjs"

  node_version    = "22.x"
  install_command = "npm ci --legacy-peer-deps"
  build_command   = "npm run build:web"

  git_fork_protection = true
  git_repository = {
    type              = "github"
    repo              = var.git_repository
    production_branch = var.production_branch
  }

  resource_config = {
    function_default_regions = [var.function_region]
  }

  lifecycle {
    prevent_destroy = false
  }
}

# AI Engine configuration managed declaratively
resource "vercel_project_environment_variable" "ai_model" {
  project_id = vercel_project.obraflow.id
  team_id    = var.team_id
  key        = "GEMINI_MODEL"
  value      = var.gemini_model
  target     = ["development", "preview", "production"]
  sensitive  = false
  comment    = "Default Google Gemini model used by the resilient AI engine."
}

# Do not set inline `environment` on vercel_project when these standalone
# resources are used. Secret values are ephemeral inputs sent through the
# provider's write-only field and are not persisted in OpenTofu state.
resource "vercel_project_environment_variable" "secret" {
  for_each = var.manage_environment_secrets ? var.environment_secret_names : toset([])

  project_id       = vercel_project.obraflow.id
  team_id          = var.team_id
  key              = each.value
  value_wo         = var.environment_secret_values[each.value]
  value_wo_version = var.environment_secret_versions[each.value]
  target           = toset([var.environment_target])
  git_branch       = var.environment_git_branch
  sensitive        = true
  comment          = "Managed by OpenTofu as a write-only secret; rotate by changing its version."
}

# Public client IDs/domains are declared separately and deliberately remain
# visible to the browser. Never put a private credential in this map.
resource "vercel_project_environment_variable" "public" {
  for_each = var.public_environment_values

  project_id = vercel_project.obraflow.id
  team_id    = var.team_id
  key        = each.key
  value      = each.value
  target     = toset([var.environment_target])
  git_branch = var.environment_git_branch
  sensitive  = false
  comment    = "Public browser configuration managed by OpenTofu."
}
