mock_provider "vercel" {}

variables {
  project_name      = "obraflow-test"
  team_id           = "team-test"
  git_repository    = "example/obraflow-test"
  production_branch = "main"
  function_region   = "iad1"
}

run "preview_secrets_are_limited_to_an_exact_branch" {
  command = plan

  variables {
    manage_environment_secrets = true
    environment_target         = "preview"
    environment_git_branch     = "feature/infra-test"
    environment_secret_names   = ["DATABASE_URL"]
    environment_secret_values = {
      DATABASE_URL = "test-only-not-a-real-credential"
    }
    environment_secret_versions = {
      DATABASE_URL = 1
    }
  }

  assert {
    condition = (
      length(vercel_project_environment_variable.secret) == 1 &&
      vercel_project_environment_variable.secret["DATABASE_URL"].git_branch == "feature/infra-test" &&
      vercel_project_environment_variable.secret["DATABASE_URL"].target == toset(["preview"])
    )
    error_message = "Preview secrets must be scoped to the selected exact branch and target."
  }
}

run "preview_secrets_without_branch_are_rejected" {
  command = plan

  variables {
    manage_environment_secrets = true
    environment_target         = "preview"
    environment_secret_names   = ["DATABASE_URL"]
    environment_secret_values = {
      DATABASE_URL = "test-only-not-a-real-credential"
    }
    environment_secret_versions = {
      DATABASE_URL = 1
    }
  }

  expect_failures = [var.environment_git_branch, var.environment_secret_names]
}

run "migration_credentials_cannot_be_sent_to_vercel" {
  command = plan

  variables {
    manage_environment_secrets = true
    environment_target         = "production"
    environment_secret_names   = ["MIGRATION_DATABASE_URL"]
    environment_secret_values = {
      MIGRATION_DATABASE_URL = "test-only-not-a-real-credential"
    }
    environment_secret_versions = {
      MIGRATION_DATABASE_URL = 1
    }
  }

  expect_failures = [var.environment_secret_names]
}

run "public_configuration_must_use_next_public_names" {
  command = plan

  variables {
    environment_target = "development"
    public_environment_values = {
      DATABASE_URL = "must-not-be-public"
    }
  }

  expect_failures = [var.public_environment_values]
}
