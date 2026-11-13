variable "project_name" {
  description = "Vercel project name."
  type        = string
  default     = "obraflow"
}

variable "team_id" {
  description = "Vercel team ID that owns the project."
  type        = string
}

variable "git_repository" {
  description = "GitHub repository in owner/repository format."
  type        = string

  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.git_repository))
    error_message = "git_repository must use owner/repository format."
  }
}

variable "production_branch" {
  description = "Git branch that triggers production deployments."
  type        = string
  default     = "main"
}

variable "function_region" {
  description = "Vercel Function region selected to be close to the Neon project."
  type        = string
}

variable "manage_environment_secrets" {
  description = "Enable write-only secret variables after a project/environment and a secret-manager handoff are verified."
  type        = bool
  default     = false
}

variable "environment_target" {
  description = "Exactly one Vercel target for this module state: development, preview, or production. Select only after environment isolation is approved."
  type        = string
  nullable    = true
  default     = null

  validation {
    condition     = var.environment_target == null || contains(["development", "preview", "production"], var.environment_target)
    error_message = "environment_target must be development, preview, production, or null when environment variables are disabled."
  }
}

variable "environment_git_branch" {
  description = "Optional exact branch scope for Preview variables; required for secrets targeting Preview to avoid sharing them with every preview deployment."
  type        = string
  nullable    = true
  default     = null

  validation {
    condition     = var.environment_git_branch == null || (length(trimspace(var.environment_git_branch)) > 0 && var.environment_target == "preview")
    error_message = "environment_git_branch must be a non-empty branch name and can only be used with the preview target."
  }

  validation {
    condition     = !var.manage_environment_secrets || var.environment_target != "preview" || var.environment_git_branch != null
    error_message = "Secrets targeting Preview must be scoped to one verified Git branch."
  }
}

variable "environment_secret_names" {
  description = "Non-secret names of Vercel secrets; values arrive separately through ephemeral project_secret_values."
  type        = set(string)
  default     = []

  validation {
    condition = alltrue([
      for name in var.environment_secret_names :
      can(regex("^[A-Z][A-Z0-9_]*$", name))
      && !startswith(name, "NEXT_PUBLIC_")
      && !contains(["MIGRATION_DATABASE_URL", "SEED_DATABASE_URL", "ALLOW_DEMO_SEED"], name)
    ])
    error_message = "Secret names must be uppercase server-only variables; public browser variables and CI/demo-seed credentials are not allowed in this secret set."
  }

  validation {
    condition = !var.manage_environment_secrets || (
      length(var.environment_secret_names) > 0
      && var.environment_target != null
      && (var.environment_target != "preview" || var.environment_git_branch != null)
      && var.environment_secret_names == nonsensitive(toset(keys(var.environment_secret_values)))
      && var.environment_secret_names == toset(keys(var.environment_secret_versions))
    )
    error_message = "When managing secrets, select one Vercel target and provide exactly one ephemeral value and positive rotation version for each declared secret name."
  }
}

variable "environment_secret_values" {
  description = "Sensitive, ephemeral Vercel secret values supplied by the approved secret manager; values never belong in tfvars, plans, or state."
  type        = map(string)
  sensitive   = true
  ephemeral   = true
  default     = {}

  validation {
    condition     = alltrue([for value in values(var.environment_secret_values) : nonsensitive(value) != ""])
    error_message = "Vercel secret values must not be empty."
  }
}

variable "environment_secret_versions" {
  description = "Non-secret per-variable version numbers. Increment the matching version whenever its write-only secret value rotates."
  type        = map(number)
  default     = {}

  validation {
    condition     = alltrue([for version in values(var.environment_secret_versions) : version >= 1 && floor(version) == version])
    error_message = "Every secret version must be a positive integer."
  }
}

variable "public_environment_values" {
  description = "Non-sensitive public browser settings (for example NEXT_PUBLIC_THIRDWEB_CLIENT_ID); values are intentionally stored in state and delivered to the browser."
  type        = map(string)
  default     = {}

  validation {
    condition = alltrue([
      for name in keys(var.public_environment_values) : can(regex("^NEXT_PUBLIC_[A-Z0-9_]+$", name))
    ])
    error_message = "Only NEXT_PUBLIC_* names may be configured in public_environment_values."
  }

  validation {
    condition     = length(var.public_environment_values) == 0 || var.environment_target != null
    error_message = "Select one Vercel environment_target when public environment variables are configured."
  }

  validation {
    condition     = length(var.public_environment_values) == 0 || var.environment_git_branch == null || var.environment_target == "preview"
    error_message = "environment_git_branch can only be used with the preview target."
  }
}
