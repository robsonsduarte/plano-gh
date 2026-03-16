import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  process.stderr.write(`Unexpected pool error: ${err.message}\n`);
  process.exit(1);
});

export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    process.stderr.write(`Slow query (${duration}ms): ${text}\n`);
  }
  return result;
}

export default pool;
