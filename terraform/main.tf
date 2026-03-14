terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "cicd-analyzer-tfstate"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# =============================================================================
# Module: APIs - Enable required GCP services
# =============================================================================
module "apis" {
  source = "./modules/apis"

  project_id = var.project_id
}

# =============================================================================
# Module: IAM - Service account and role bindings
# =============================================================================
module "iam" {
  source = "./modules/iam"

  project_id = var.project_id

  depends_on = [module.apis]
}

# =============================================================================
# Module: Secret Manager - Store application secrets
# =============================================================================
module "secret_manager" {
  source = "./modules/secret-manager"

  project_id = var.project_id

  secrets = {
    "openai-api-key"       = var.openai_api_key
    "github-token"         = var.github_token
    "github-webhook-secret" = var.github_webhook_secret
    "supabase-url"         = var.supabase_url
    "supabase-key"         = var.supabase_key
  }

  service_account_email = module.iam.service_account_email

  depends_on = [module.apis]
}

# =============================================================================
# Module: Cloud Run - Backend service
# =============================================================================
module "backend" {
  source = "./modules/cloud-run"

  project_id            = var.project_id
  region                = var.region
  service_name          = "cicd-analyzer-backend"
  image                 = "gcr.io/${var.project_id}/cicd-analyzer-backend:latest"
  port                  = 8000
  service_account_email = module.iam.service_account_email
  max_instances         = var.max_instances
  min_instances         = 0
  memory                = "512Mi"
  cpu                   = "1"
  allow_unauthenticated = true

  env_vars = {
    OPENAI_MODEL = var.openai_model
    CORS_ORIGINS = jsonencode(var.cors_origins)
  }

  secret_env_vars = {
    OPENAI_API_KEY        = module.secret_manager.secret_ids["openai-api-key"]
    GITHUB_TOKEN          = module.secret_manager.secret_ids["github-token"]
    GITHUB_WEBHOOK_SECRET = module.secret_manager.secret_ids["github-webhook-secret"]
    SUPABASE_URL          = module.secret_manager.secret_ids["supabase-url"]
    SUPABASE_KEY          = module.secret_manager.secret_ids["supabase-key"]
  }

  depends_on = [module.apis, module.iam, module.secret_manager]
}

# =============================================================================
# Module: Cloud Run - Frontend service
# =============================================================================
module "frontend" {
  source = "./modules/cloud-run"

  project_id            = var.project_id
  region                = var.region
  service_name          = "cicd-analyzer-frontend"
  image                 = "gcr.io/${var.project_id}/cicd-analyzer-frontend:latest"
  port                  = 3000
  service_account_email = module.iam.service_account_email
  max_instances         = 3
  min_instances         = 0
  memory                = "256Mi"
  cpu                   = "1"
  allow_unauthenticated = true

  env_vars = {
    VITE_API_URL = module.backend.service_url
  }

  secret_env_vars = {}

  depends_on = [module.apis, module.iam, module.backend]
}
