variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resource deployment"
  type        = string
  default     = "us-central1"
}

variable "openai_model" {
  description = "OpenAI model to use for pipeline analysis"
  type        = string
  default     = "gpt-4o-mini"
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances for the backend"
  type        = number
  default     = 5
}

variable "cors_origins" {
  description = "Allowed CORS origins for the backend API"
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:5173"]
}

# -----------------------------------------------------------------------------
# Sensitive variables (passed via terraform.tfvars or CI/CD secrets)
# -----------------------------------------------------------------------------

variable "openai_api_key" {
  description = "OpenAI API key for pipeline log analysis"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token for repo access and PR comments"
  type        = string
  sensitive   = true
}

variable "github_webhook_secret" {
  description = "GitHub webhook secret for verifying incoming webhook payloads"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase project URL for data persistence"
  type        = string
  sensitive   = true
}

variable "supabase_key" {
  description = "Supabase anonymous/service key for database access"
  type        = string
  sensitive   = true
}
