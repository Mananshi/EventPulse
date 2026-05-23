resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16" # 65,536 private IP addresses
  enable_dns_hostnames = true           # lets RDS/ElastiCache get DNS names
  enable_dns_support   = true
}

# ── SUBNETS ────────────────────────────────────────────────────────────────────
# Public subnets: have a route to the internet (for load balancers, NAT gateway).
# Private subnets: no direct internet access (for RDS, ElastiCache, ECS tasks).

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true # instances launched here get a public IP
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "${var.aws_region}a"
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "${var.aws_region}b"
}

# ── INTERNET GATEWAY ───────────────────────────────────────────────────────────
# The Internet Gateway is the door between your VPC and the public internet.
# Without this, nothing in the VPC can reach or be reached from the internet.
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

# ── ROUTE TABLE ────────────────────────────────────────────────────────────────
# Route tables define where network traffic goes.
# This table sends all internet-bound traffic (0.0.0.0/0) through the IGW.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

# Associate the public route table with the public subnets.
resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

# ── SECURITY GROUPS ────────────────────────────────────────────────────────────
# Security groups are stateful firewalls attached to resources.
# Stateful = if you allow inbound traffic, the response is automatically allowed out.

# API service: accepts HTTP from anywhere, can talk outbound to Kafka/Redis/Postgres.
resource "aws_security_group" "api" {
  name   = "eventpulse-api"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1" # all protocols
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS: only accepts connections from within the VPC (not the public internet).
resource "aws_security_group" "rds" {
  name   = "eventpulse-rds"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # only from inside the VPC
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ElastiCache (Redis): only accessible from within the VPC.
resource "aws_security_group" "redis" {
  name   = "eventpulse-redis"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
