output "service_account_email" {
  description = "Email address of the CI/CD Analyzer service account"
  value       = google_service_account.cicd_analyzer.email
}

output "service_account_id" {
  description = "Unique ID of the CI/CD Analyzer service account"
  value       = google_service_account.cicd_analyzer.unique_id
}
