import 'dotenv/config';
import { Pool } from 'pg';

// Pool manages a set of reusable Postgres connections.
// Instead of opening a new TCP connection per query (slow), the pool
// keeps connections alive and hands them out as needed.
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT) || 5432,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
});

export default pool;