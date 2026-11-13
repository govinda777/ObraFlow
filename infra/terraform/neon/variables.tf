variable "project_name" {
  description = "Base name used for the Neon project in this environment."
  type        = string
  default     = "obraflow"
}

variable "database_name" {
  description = "Default database created with the Neon project."
  type        = string
  default     = "obraflow"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{0,62}$", var.database_name))
    error_message = "database_name must be a valid PostgreSQL identifier of at most 63 characters."
  }
}

variable "environment" {
  description = "Isolated Neon project environment."
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "environment must be development, staging, or production."
  }
}

variable "region_id" {
  description = "Neon region selected to be close to the Vercel Function region."
  type        = string
}

variable "history_retention_seconds" {
  description = "Explicit PITR history retention for this environment; set according to the approved recovery objective and Neon plan."
  type        = number

  validation {
    condition     = var.history_retention_seconds >= 86400
    error_message = "history_retention_seconds must be at least one day."
  }
}

variable "autoscaling_min_cu" {
  description = "Minimum compute units for the primary Neon compute."
  type        = number
  default     = 0.25
}

variable "autoscaling_max_cu" {
  description = "Maximum compute units for the primary Neon compute; keep the cap explicit for cost control."
  type        = number
  default     = 1

  validation {
    condition     = var.autoscaling_max_cu >= var.autoscaling_min_cu
    error_message = "autoscaling_max_cu must be greater than or equal to autoscaling_min_cu."
  }
}

variable "manage_runtime_role" {
  description = "Enable the PostgreSQL provider role after the Neon project exists and PG* connection variables point to its direct endpoint."
  type        = bool
  default     = false
}

variable "runtime_role_password" {
  description = "Ephemeral application-role password. Supply through a trusted secret manager as TF_VAR_runtime_role_password; never place it in a tfvars file."
  type        = string
  sensitive   = true
  ephemeral   = true
  default     = null

  validation {
    condition     = !var.manage_runtime_role || try(length(var.runtime_role_password), 0) >= 32
    error_message = "When manage_runtime_role is true, provide a runtime role password of at least 32 characters through a trusted secret manager."
  }
}

variable "runtime_role_password_version" {
  description = "Increment this string whenever rotating runtime_role_password."
  type        = string
  default     = "1"
}

variable "manage_migration_role" {
  description = "Enable the separate DDL-only migration login after Neon exists and direct PG* connection variables point to its endpoint."
  type        = bool
  default     = false
}

variable "migration_role_password" {
  description = "Ephemeral password for the schema migration role. Supply via a trusted secret manager; never put it in tfvars or a saved plan."
  type        = string
  sensitive   = true
  ephemeral   = true
  default     = null

  validation {
    condition     = !var.manage_migration_role || try(length(var.migration_role_password), 0) >= 32
    error_message = "When manage_migration_role is true, provide a migration role password of at least 32 characters through a trusted secret manager."
  }
}

variable "migration_role_password_version" {
  description = "Increment this string whenever rotating migration_role_password."
  type        = string
  default     = "1"
}
