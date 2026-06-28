require('dotenv').config();
const { query } = require('../db');

async function migrate() {
  console.log('Running migrations...');

  // Counters table
  await query(`
    CREATE TABLE IF NOT EXISTS counters (
      id SERIAL PRIMARY KEY,
      name VARCHAR(1) UNIQUE NOT NULL,
      label VARCHAR(100),
      description TEXT,
      total_slots INTEGER DEFAULT 100,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Slots table
  await query(`
    CREATE TABLE IF NOT EXISTS slots (
      id SERIAL PRIMARY KEY,
      counter_name VARCHAR(1) NOT NULL REFERENCES counters(name) ON DELETE CASCADE,
      slot_number INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'maintenance')),
      UNIQUE(counter_name, slot_number)
    )
  `);

  // Bookings table
  await query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      reg_number VARCHAR(50) NOT NULL,
      username VARCHAR(100) NOT NULL,
      counter_name VARCHAR(1) NOT NULL REFERENCES counters(name),
      slot_number INTEGER NOT NULL,
      in_time TIMESTAMP DEFAULT NOW(),
      out_time TIMESTAMP,
      duration_minutes INTEGER,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'reset')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Index for faster queries
  await query(`CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_slots_counter_status ON slots(counter_name, status)`);

  // Daily stats view
  await query(`
    CREATE OR REPLACE VIEW daily_stats AS
    SELECT
      DATE(in_time) as date,
      counter_name,
      COUNT(*) as total_bookings,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      ROUND(AVG(duration_minutes)) as avg_duration_mins
    FROM bookings
    WHERE status != 'reset'
    GROUP BY DATE(in_time), counter_name
    ORDER BY date DESC
  `);

  console.log('✅ Migrations complete');
  process.exit(0);
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
