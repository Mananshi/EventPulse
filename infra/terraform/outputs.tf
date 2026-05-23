# Outputs are printed after `terraform apply` completes.
# Use these to configure your services to connect to the provisioned resources.

output "rds_endpoint" {
  description = "RDS Postgres connection endpoint (host:port)"
  value       = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs (for load balancers and ECS tasks)"
  value       = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}
