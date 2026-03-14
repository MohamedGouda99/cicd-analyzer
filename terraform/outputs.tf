output "backend_url" {
  description = "URL of the backend Cloud Run service"
  value       = module.backend.service_url
}

output "frontend_url" {
  description = "URL of the frontend Cloud Run service"
  value       = module.frontend.service_url
}

output "service_account_email" {
  description = "Email of the application service account"
  value       = module.iam.service_account_email
}
