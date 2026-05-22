#!/bin/bash
# Run this after `docker compose up -d` to create the required Kafka topics.

set -e

BOOTSTRAP="localhost:9092"

echo "Creating Kafka topics..."

# ingest-events: main pipeline topic
# 3 partitions = up to 3 worker instances can consume in parallel
docker compose exec kafka kafka-topics \
  --create --if-not-exists \
  --topic ingest-events \
  --bootstrap-server $BOOTSTRAP \
  --partitions 3 \
  --replication-factor 1

# ingest-dlq: dead-letter queue for failed events
# 1 partition is enough -- this is low-volume error traffic only
docker compose exec kafka kafka-topics \
  --create --if-not-exists \
  --topic ingest-dlq \
  --bootstrap-server $BOOTSTRAP \
  --partitions 1 \
  --replication-factor 1

echo "Topics created:"
docker compose exec kafka kafka-topics --list --bootstrap-server $BOOTSTRAP
