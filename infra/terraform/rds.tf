# RDS requires a subnet group -- tells it which subnets it can place instances in.
# We use private subnets so Postgres is never directly reachable from the internet.
resource "aws_db_subnet_group" "main" {
  name       = "eventpulse-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

# The managed Postgres instance.
# AWS handles backups, patching, failover, and storage scaling.
resource "aws_db_instance" "postgres" {
  identifier = "eventpulse-postgres"

  engine         = "postgres"
  engine_version = "15"

  # db.t3.micro = 2 vCPU, 1GB RAM. Free tier eligible.
  # In production you'd use db.t3.small or larger.
  instance_class = "db.t3.micro"

  allocated_storage = 20  # GB
  storage_type      = "gp2"

  db_name  = "eventpulsedb"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Skip final snapshot when destroying (fine for dev, NOT for production).
  skip_final_snapshot = true

  # Don't expose Postgres to the public internet.
  publicly_accessible = false
}
