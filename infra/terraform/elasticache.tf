# Same pattern as RDS -- ElastiCache needs a subnet group for placement.
resource "aws_elasticache_subnet_group" "main" {
  name       = "eventpulse-redis-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

# A single-node Redis cluster for idempotency checks.
# cache.t3.micro = free tier eligible.
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "eventpulse-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
}
