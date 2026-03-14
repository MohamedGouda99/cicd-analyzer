variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the Cloud Run service"
  type        = string
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
}

variable "image" {
  description = "Docker image URI for the service"
  type        = string
}

variable "port" {
  description = "Container port to expose"
  type        = number
}

variable "service_account_email" {
  description = "Service account email for the Cloud Run service"
  type        = string
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 5
}

variable "min_instances" {
  description = "Minimum number of instances (0 allows scale to zero)"
  type        = number
  default     = 0
}

variable "memory" {
  description = "Memory limit for each instance"
  type        = string
  default     = "512Mi"
}

variable "cpu" {
  description = "CPU limit for each instance"
  type        = string
  default     = "1"
}

variable "allow_unauthenticated" {
  description = "Whether to allow unauthenticated access"
  type        = bool
  default     = false
}

variable "env_vars" {
  description = "Map of environment variable names to plain-text values"
  type        = map(string)
  default     = {}
}

variable "secret_env_vars" {
  description = "Map of environment variable names to Secret Manager secret IDs"
  type        = map(string)
  default     = {}
}
