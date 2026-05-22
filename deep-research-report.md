# EventPulse: Distributed Event Ingestion & Realtime Analytics

The **EventPulse** system uses an **event-driven architecture**: front-end clients or services *produce* events, which are sent to a central ingestion layer (Kafka), and one or more back-end services *consume* those events asynchronously【26†L150-L158】【24†L130-L138】. In this model, Kafka topics act like durable logs or folders of events: producers write events into topics (logs), and consumers independently read from those topics【26†L150-L158】【24†L130-L138】. By decoupling producers and consumers in this way, the system can scale to high volumes and tolerate failures (Kafka partitions and replicates data for throughput and durability【26†L182-L190】). 

【2†embed_image】 *Event-driven architecture:* producers (clients, APIs) send events to the Kafka-based ingestion pipeline, which then distributes events to multiple consumers【1†L51-L53】【26†L150-L158】. Each Kafka **topic** is an ordered, persistent log of events (like a folder of timestamped files)【24†L130-L138】. This setup lets us add or remove consumers (workers) independently, since all consumers simply read from the same event stream. It also enables **replay** and **fault tolerance**: if a consumer crashes, it can resume reading events by tracking its offset in the Kafka topic【26†L182-L190】. 

## 1. Development Environment Setup

1. **Install Docker & Docker Compose.** Ensure you have [Docker](https://www.docker.com/products/docker-desktop) and Docker Compose installed locally. We will run Kafka, Zookeeper, Postgres, and Redis in containers for easy setup.  
2. **Create project directory.** For example:  
   ```
   mkdir eventpulse && cd eventpulse
   ```  
   Inside this folder, we will keep the code and a `docker-compose.yml`.  
3. **Write `docker-compose.yml`.** Define services for:  
   - **Zookeeper:** Kafka requires Zookeeper (unless using KRaft mode). Use an official image like `confluentinc/cp-zookeeper`.  
   - **Kafka broker:** Use `confluentinc/cp-kafka` or `apache/kafka`. Expose port 9092. Configure `KAFKA_ADVERTISED_LISTENERS` (e.g. PLAINTEXT://kafka:9092) and link to Zookeeper.  
   - **PostgreSQL:** Use the official `postgres` image. Expose port 5432. Add a volume to persist data and set environment (user/password/db).  
   - **Redis:** Use the `redis:latest` image. Expose port 6379. Redis will be used for caching or pub/sub.  
   Your `docker-compose.yml` might look like:  
   ```yaml
   version: '3.8'
   services:
     zookeeper:
       image: confluentinc/cp-zookeeper:latest
       environment:
         ZOOKEEPER_CLIENT_PORT: 2181

     kafka:
       image: confluentinc/cp-kafka:latest
       depends_on: [zookeeper]
       ports:
         - "9092:9092"
       environment:
         KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
         KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
         KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT
         KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT

     postgres:
       image: postgres:15
       ports:
         - "5432:5432"
       environment:
         POSTGRES_USER: eventpulse
         POSTGRES_PASSWORD: secret
         POSTGRES_DB: eventpulsedb

     redis:
       image: redis:7
       ports:
         - "6379:6379"
   ```  
4. **Start containers.** Run `docker-compose up -d`. Verify all services are running (`docker ps`). Ensure Kafka logs show it started and is listening on 9092.  
5. **Create Kafka topics.** Open a new terminal. Use Kafka’s CLI (inside the Kafka container or via `docker-compose exec kafka`). For example:  
   ```bash
   # Create main ingestion topic and a dead-letter topic
   kafka-topics --create --topic ingest-events --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
   kafka-topics --create --topic ingest-dlq    --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
   ```  
   (Topics organize events. We use multiple partitions for the main topic to allow parallel consumption. The “ingest-dlq” topic is for failed events.)  
6. **Verify Kafka.** Produce a test message and consume it:  
   ```bash
   kafka-console-producer --topic ingest-events --bootstrap-server localhost:9092
   > {"test":"hello"}
   [Ctrl-D to end]
   kafka-console-consumer --topic ingest-events --from-beginning --bootstrap-server localhost:9092
   ```
   You should see the `{"test":"hello"}` message returned. This confirms the Docker environment is correctly set up.

## 2. Ingestion API Implementation (Node.js + TypeScript)

1. **Initialize Node project.** In `eventpulse/api/`, run `npm init -y` and install TypeScript, Express, and a Kafka client library (e.g. `npm install express kafkajs`). Enable TypeScript by `npm install typescript ts-node @types/node @types/express`.  
2. **Set up Express server.** Create `server.ts` (or `.js`) that starts an HTTP server on port 3000. Configure Express to parse JSON bodies. For example, `POST /events` endpoint. We choose **Node.js/TypeScript** because it has great Kafka and Express support and is easier for rapid development (vs. using Go, which we skip).  
3. **Define the event schema.** Decide what fields each event should have (e.g. `id`, `timestamp`, `type`, `payload`). We can enforce this in code (using TypeScript interfaces) but keep it simple: expect JSON with known fields. **Consistency matters**: producers and consumers must agree on this format (define a simple schema now; schema registry could be added later).  
4. **Integrate Kafka producer.** In the `/events` handler, take the incoming JSON and send it to Kafka:  
   - Initialize a `Kafka` client (using the broker at `localhost:9092`).  
   - Create a producer (`const producer = kafka.producer()`) and call `await producer.connect()`.  
   - In the endpoint, `await producer.send({ topic: 'ingest-events', messages: [{ key: event.id, value: JSON.stringify(event) }] })`.  
   Here we use **Kafka topics** to queue events【26†L150-L158】【24†L130-L138】. Each HTTP request publishes an event message to the topic.  
5. **Handle idempotency (optional).** If the same event might be sent twice, consider using Redis or database to track processed IDs. For example, before publishing, check Redis:  
   ```js
   const exists = await redisClient.exists(`event:${event.id}`);
   if (!exists) {
     // produce to Kafka and mark in Redis with an expiry
     redisClient.set(`event:${event.id}`, '1', 'EX', 3600);
     await producer.send(...);
   } else {
     // ignore duplicate
   }
   ```  
   This prevents accidental duplicates. (At minimum, include a unique event ID so consumers can detect duplicates.)  
6. **Batching support (optional).** If many events arrive at once, you could also implement a `POST /events/batch` that accepts an array of events. Loop over them and send in one Kafka `send()` call with multiple messages.  
7. **Test the API.** Restart the service (`ts-node server.ts`). Use `curl` or Postman:  
   ```bash
   curl -X POST http://localhost:3000/events -H "Content-Type: application/json" -d '{"id":"1","type":"click","timestamp":123456789,"data":{"x":5}}'
   ```  
   The API should respond with 200 OK. Then consume from Kafka (as in setup) to verify the JSON made it into the `ingest-events` topic.  

## 3. Kafka Consumer & Event Processing

1. **Create a consumer service.** In `eventpulse/worker/`, set up another Node.js/TS project (install Kafka client, Postgres client). This service will **subscribe to Kafka** and save events to Postgres.  
2. **Connect to Kafka as consumer.** Using the same Kafka cluster, create a Kafka consumer (e.g. `const consumer = kafka.consumer({ groupId: 'eventpulse-workers' });`) and subscribe to the main topic:  
   ```js
   await consumer.connect();
   await consumer.subscribe({ topic: 'ingest-events', fromBeginning: true });
   await consumer.run({
     eachMessage: async ({ message }) => {
       const event = JSON.parse(message.value.toString());
       // ... process event ...
     }
   });
   ```  
   By using a consumer group, multiple worker instances can share the load (each instance gets a subset of partitions)【26†L150-L158】【26†L182-L190】.  
3. **Persist to PostgreSQL.** In the `eachMessage` handler: connect to Postgres (using `pg` library). Insert the event into a table (e.g. `events`) with appropriate columns (`id`, `type`, `timestamp`, `payload`). For example:  
   ```js
   await pgClient.query(
     'INSERT INTO events(id, type, ts, data) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
     [event.id, event.type, event.timestamp, event.data]
   );
   ```  
   Use `ON CONFLICT` or a unique constraint on `id` to avoid duplicates (idempotent writes).  
4. **Handle failures and DLQ.** Wrap processing in a try/catch. If a database insert fails (e.g. due to a transient error), retry a few times. If still failing, **produce the problematic event into the DLQ topic** (`ingest-dlq`) for later inspection. For example:  
   ```js
   try { 
     await insertToDB(event);
     // optional: update Redis counters or metrics here
   } catch (err) {
     console.error("DB error, pushing to DLQ", err);
     await producer.send({ topic: 'ingest-dlq', messages: [{ value: JSON.stringify(event) }] });
   }
   ```  
   Having a dead-letter queue ensures no message is “lost” without notice. We can treat DLQ messages separately (e.g. alert or manual reprocessing).  
5. **Commit offsets manually (optional).** By default, KafkaJS commits offsets automatically after `eachMessage`. For at-least-once delivery, you can control commits. If you prefer **exactly-once**, Kafka transactions and idempotent producers are needed (more advanced). For now, auto-commit is fine, but be aware: if the consumer crashes after writing to DB but before commit, it will reprocess the event (avoid duplicate insertion with DB constraints).  
6. **Verify the worker.** Run the worker service (`ts-node worker.js`). Produce some events via the API, and watch Postgres: you should see rows in the `events` table. Stop the Postgres service or break the table schema to force an error: the consumer should catch the error and send the message to `ingest-dlq`. You can verify by consuming from the DLQ topic.  
7. **Scaling note:** If you run multiple instances of this consumer (in Docker Compose), Kafka will distribute partitions among them (only one consumer in a group processes each partition)【26†L150-L158】. This is how we achieve horizontal scalability. You can later increase the number of partitions in the topic to handle higher throughput【26†L182-L190】.

## 4. Real-Time React Dashboard (WebSockets)

1. **Setup React app.** In `eventpulse/dashboard/`, create a React project (e.g. `npx create-react-app dashboard --template typescript`). This will be our front-end to display live data.  
2. **Design UI components.** Plan a simple UI:  
   - A list or table of recent events.  
   - Real-time counters (e.g. events per minute, error count).  
   - A connection status indicator (showing if WebSocket is connected).  
   We’ll use **WebSockets** so the UI updates instantly without polling.  
3. **Implement WebSocket server.** Extend the backend (for example, integrate into the existing ingestion API or worker service, or create a new small Node service) to handle WebSocket connections:  
   - Use a library like `ws` or `socket.io`.  
   - On the server side, every time an event is ingested or processed, broadcast it to all connected clients. For example, after successfully writing to Postgres, the consumer could do: `wss.clients.forEach(ws => ws.send(JSON.stringify({type: 'newEvent', payload: event})))`.  
   - If using Redis, you could also publish events on a Redis channel and have the WS server subscribe to that channel to broadcast. Either way, the effect is that *clients get pushed each new event*.  
4. **Connect React to WebSocket.** In the React app:  
   - On app load, open a WebSocket connection (e.g. `const socket = new WebSocket('ws://localhost:3000');`).  
   - Listen for messages (`socket.onmessage`), parse the JSON (e.g. `{type:'newEvent', payload: {...}}`).  
   - Update React state (e.g. add the new event to an array, increment counters).  
   - Optionally, also create REST endpoints in the backend (e.g. `GET /stats` or `GET /events?limit=50`) so the dashboard can fetch initial data on load or support filters. For now, real-time push is key.  
5. **Example UI:** Display a table of the last 10 events (updated live), and a chart or simple text showing event rate. You might use a library like Chart.js or just simple HTML. The important part is the **WebSocket flow**: whenever `newEvent` arrives, re-render the list and counters.  
6. **Test the dashboard.** Run the React app (`npm start`). Then, in another terminal, send a few events via the API. You should see them appear instantly in the UI. Try sending events rapidly to see live update. If using multiple browser tabs, all should update via WS.  
7. **Why WebSockets:** Unlike HTTP polling, WebSockets keep a persistent connection and allow the server to push updates immediately. This is ideal for “live” dashboards where new data should appear without delay. 

## 5. Observability & Deployment

1. **Add OpenTelemetry tracing.** Instrument the Node.js services (API and worker) using OpenTelemetry. For example, install `@opentelemetry/sdk-node` and related packages. Configure a tracer and auto-instrumentation for HTTP and Kafka. This will generate traces for each incoming HTTP request and each Kafka send/receive. You can export traces to the console or to a collector (OTLP). Observability lets us see the flow of an event through the system.  
2. **Expose Prometheus metrics.** Use a Prometheus client (e.g. `prom-client` for Node). In each service, create metrics like:  
   - Counters (total events received, total events processed, errors, etc.)  
   - Histogram/gauge (processing latency, queue lag).  
   Expose a `/metrics` HTTP endpoint in each service for Prometheus to scrape. For example, in Express: `app.get('/metrics', async (_, res) => res.send(await register.metrics()));`.  
3. **Run Prometheus and Grafana (optional).** You can quickly spin up Prometheus + Grafana (via Docker or Terraform) to scrape the services’ `/metrics` endpoints. This will let you build dashboards and alerts. For example, plot “Events per second” or “consumer lag”. Even if you skip writing complex dashboards now, having metrics endpoints means you *could* monitor the system.  
4. **Containerize services.** Write Dockerfiles for each component (API, worker, React app). Example: for Node services, start from `node:18`, copy code, `npm install`, and `npm run build` or `tsc`. For the React app, build static files with `npm run build` and serve via a simple Node/Express or Nginx. Then, push these images to a registry (Docker Hub or AWS ECR).  
5. **Terraform infrastructure.** Use Terraform to provision cloud resources for production. At minimum:  
   - **Compute:** e.g. an AWS ECS cluster (or a single EC2) to run the Docker containers.  
   - **Database:** an AWS RDS Postgres for the `events` table.  
   - **Cache:** an AWS ElastiCache (Redis) instance if needed.  
   - **Networking:** VPC, subnets, security groups to allow traffic (ports 80/443, 3000, 9092 etc.) and restrict access.  
   In Terraform, define `provider "aws"`, then resources like `aws_vpc`, `aws_ecs_cluster`, `aws_ecs_service`, `aws_db_instance`, etc. For example:  
   ```hcl
   resource "aws_db_instance" "postgres" {
     engine       = "postgres"
     instance_class = "db.t3.micro"
     name         = "eventpulse"
     username     = "eventpulse"
     password     = "secret"
     allocated_storage = 20
   }
   ```  
   (Similarly define ECS/ECR or EC2 to run containers.) The goal is to automate deployment: after `terraform apply`, your services should run in AWS.  
6. **Connect services.** Once deployed, update configuration (environment variables) so that API/consumer services connect to the AWS RDS endpoint instead of local Postgres, and to a Kafka cluster if using a managed Kafka (or keep the Docker Kafka on a single EC2). If using AWS MSK (managed Kafka), configure the brokers and topic names accordingly.  
7. **Validate in cloud.** After deployment, verify all services are running: hit the ingestion API endpoint on its public URL, send test events, and check the AWS Postgres database. Verify metrics: set up Prometheus in AWS or use CloudWatch to confirm traffic. Ensure logs can be accessed (e.g. via CloudWatch Logs).  

By following these steps, you will build **EventPulse** incrementally: first locally with Docker Compose, then adding code for the API and workers, then a live dashboard, and finally instrumentation and deployment. Each step is **testable** (e.g. use `curl`, Kafka console tools, and the browser) so you know it’s working before moving on. This thorough, step-by-step plan ensures clarity at every stage – from architecture choices to implementation details – so you can confidently build a scalable distributed ingestion pipeline even as a newcomer to this domain. 

**Sources:** We follow standard event-driven and Kafka patterns【26†L150-L158】【24†L130-L138】, and use best practices for reliability and observability【26†L182-L190】【1†L51-L53】. These guidelines and references inform our architecture and implementation choices.