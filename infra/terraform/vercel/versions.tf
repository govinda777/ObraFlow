terraform {
  required_version = ">= 1.11.0, < 2.0.0"

  backend "pg" {}

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "= 5.24.1"
    }
  }
}

provider "vercel" {
  team = var.team_id
}
