# Infrastructure

Local development environment using Docker Compose. Runs Kafka, Zookeeper, PostgreSQL, and Redis.

## Services

| Service    | Port  | Purpose                              |
|------------|-------|--------------------------------------|
| Kafka      | 9092  | Message broker (event ingestion)     |
| Zookeeper  | 2181  | Kafka cluster coordinator            |
| PostgreSQL | 5432  | Persistent event storage             |
| Redis      | 6379  | Idempotency checks (duplicate guard) |

## Start

```bash
cd infra
docker compose up -d
```

## Verify all containers are running

```bash
docker ps
```

## Check Kafka started

```bash
docker compose logs kafka | grep "started"
```

## Check PostgreSQL

```bash
docker compose exec postgres psql -U eventpulse -d eventpulsedb -c "\l"
# Exit psql: \q
```

## Stop

```bash
docker compose down
```

## Stop and wipe all data (including postgres volume)

```bash
docker compose down -v
```
