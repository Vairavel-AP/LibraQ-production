require('dotenv').config();
const { query, pool } = require('../db');

async function seed() {
  console.log('Seeding database...');

  const counters = [
    { name: 'A', label: 'Counter A', description: 'Ground Floor - East Wing' },
    { name: 'B', label: 'Counter B', description: 'Ground Floor - West Wing' },
    { name: 'C', label: 'Counter C', description: 'First Floor - East Wing' },
    { name: 'D', label: 'Counter D', description: 'First Floor - West Wing' }
  ];

  for (const counter of counters) {
    await query(
      `INSERT INTO counters (name, label, description, total_slots)
       VALUES ($1, $2, $3, 100)
       ON CONFLICT (name) DO NOTHING`,
      [counter.name, counter.label, counter.description]
    );

    // Insert 100 slots per counter
    for (let i = 1; i <= 100; i++) {
      await query(
        `INSERT INTO slots (counter_name, slot_number, status)
         VALUES ($1, $2, 'free')
         ON CONFLICT (counter_name, slot_number) DO NOTHING`,
        [counter.name, i]
      );
    }
    console.log(`  ✅ Counter ${counter.name}: 100 slots seeded`);
  }

  console.log('✅ Seed complete');
  await pool.end();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
