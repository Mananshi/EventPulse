variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "db_password" {
  description = "Master password for the RDS Postgres instance"
  type        = string
  sensitive   = true # Terraform redacts this from logs and plan output
}

variable "db_username" {
  description = "Master username for the RDS Postgres instance"
  type        = string
  default     = "eventpulse"
}
