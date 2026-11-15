project_name      = "obraflow-prod"
team_id           = "team_IDilvuF0u9Aceg0yggcAQmZ8"
git_repository    = "govinda777/ObraFlow"
production_branch = "main"
function_region   = "iad1"
gemini_model      = "gemini-2.5-flash"
ignore_command    = "if [ \"$VERCEL_GIT_COMMIT_REF\" != \"main\" ]; then exit 0; else exit 1; fi"

