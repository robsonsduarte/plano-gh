import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  sex VARCHAR(1) CHECK (sex IN ('M','F')),
  age INTEGER,
  height NUMERIC(5,1),
  weight NUMERIC(5,1),
  activity_level VARCHAR(20) DEFAULT 'moderate',
  diet_type VARCHAR(20) DEFAULT 'normal',
  favorites TEXT[] DEFAULT '{}',
  restrictions TEXT[] DEFAULT '{}',
  quiz_answers JSONB DEFAULT '{}',
  quiz_result JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC(5,1),
  waist NUMERIC(5,1),
  hip NUMERIC(5,1),
  energy INTEGER CHECK (energy BETWEEN 1 AND 5),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_checks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  week_num INTEGER NOT NULL,
  item_key VARCHAR(50) NOT NULL,
  checked BOOLEAN DEFAULT false,
  UNIQUE(user_id, week_num, item_key)
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  week_num INTEGER NOT NULL,
  day_num INTEGER NOT NULL,
  meal_index INTEGER NOT NULL,
  meal_type VARCHAR(30) NOT NULL,
  original_items TEXT NOT NULL,
  logged_items JSONB NOT NULL,
  total_kcal INTEGER NOT NULL DEFAULT 0,
  total_prot NUMERIC(6,1) NOT NULL DEFAULT 0,
  total_carb NUMERIC(6,1) NOT NULL DEFAULT 0,
  total_fat NUMERIC(6,1) NOT NULL DEFAULT 0,
  logged_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date, meal_index)
);

CREATE INDEX IF NOT EXISTS idx_tracking_user ON tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_market_user ON market_checks(user_id, week_num);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, date);
`;

async function init() {
  try {
    await pool.query(schema);
    process.stdout.write('Database tables created successfully.\n');
  } catch (err) {
    process.stderr.write(`Error creating tables: ${err.message}\n`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
