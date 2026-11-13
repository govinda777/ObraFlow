terraform {
  required_version = ">= 1.11.0, < 2.0.0"

  required_providers {
    neon = {
      source  = "neondatabase/neon"
      version = "= 0.19.0-beta.0"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "= 1.27.0"
    }
  }
}

provider "neon" {}

# Neon-managed credentials are administrative. Use the PostgreSQL connection
# supplied through PG* environment variables only to provision the restricted
# application role; never put these credentials in Terraform configuration.
provider "postgresql" {
  sslmode   = "verify-full"
  superuser = false
}
