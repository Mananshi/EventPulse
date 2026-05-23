# Tells Terraform which cloud provider to use and which version
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Terraform state tracks what resources exist in AWS.
  # By default it saves to a local terraform.tfstate file.
  # In a team, you'd move this to S3 so everyone shares the same state.
  # For now, local state is fine.
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = var.aws_region

  # Tags applied to every resource Terraform creates.
  # Makes it easy to find and filter all EventPulse resources in the AWS console.
  default_tags {
    tags = {
      Project     = "EventPulse"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
