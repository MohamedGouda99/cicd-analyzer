output "secret_ids" {
  description = "Map of secret names to their fully qualified resource IDs"
  value = {
    for key, secret in google_secret_manager_secret.secrets : key => secret.secret_id
  }
}

output "secret_names" {
  description = "List of created secret names"
  value       = [for key, secret in google_secret_manager_secret.secrets : secret.secret_id]
}
