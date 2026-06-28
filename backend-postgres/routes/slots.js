const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { protect } = require('../middleware/auth');

// GET /api/slots/availability — public
router.get('/availability', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        c.name,
        c.label,
        c.description,
        c.total_slots,
        c.is_active,
        COUNT(CASE WHEN s.status = 'free' THEN 1 END)::int AS free_slots,
        COUNT(CASE WHEN s.status = 'occupied' THEN 1 END)::int AS occupied_slots
      FROM counters c
      LEFT JOIN slots s ON s.counter_name = c.name
      GROUP BY c.name, c.label, c.description, c.total_slots, c.is_active
      ORDER BY c.name
    `);
    res.json({ success: true, counters: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/slots/book — authenticated
router.post('/book', protect, async (req, res) => {
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');

    const { counterName, userId, regNumber, username } = req.body;

    if (!counterName || !userId || !regNumber) {
      return res.status(400).json({ success: false, message: 'counterName, userId, and regNumber are required.' });
    }

    // Check if user already has active booking
    const existing = await client.query(
      `SELECT id, counter_name, slot_number FROM bookings
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `You already have an active slot: ${existing.rows[0].counter_name}-${existing.rows[0].slot_number}`
      });
    }

    // Check counter active
    const counter = await client.query(`SELECT * FROM counters WHERE name = $1 AND is_active = true`, [counterName]);
    if (!counter.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Counter not found or inactive.' });
    }

    // Get random free slot (with lock)
    const freeSlot = await client.query(
      `SELECT id, slot_number FROM slots
       WHERE counter_name = $1 AND status = 'free'
       ORDER BY RANDOM()
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [counterName]
    );

    if (!freeSlot.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'No slots available at this counter.' });
    }

    const slot = freeSlot.rows[0];

    // Mark slot occupied
    await client.query(
      `UPDATE slots SET status = 'occupied' WHERE id = $1`,
      [slot.id]
    );

    // Create booking
    const booking = await client.query(
      `INSERT INTO bookings (user_id, reg_number, username, counter_name, slot_number, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [userId, regNumber, username, counterName, slot.slot_number]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      booking: booking.rows[0],
      message: `Slot allocated: ${counterName}-${slot.slot_number}`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/slots/release — authenticated
router.post('/release', protect, async (req, res) => {
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');

    const { userId, bookingId } = req.body;

    // Find active booking
    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [bookingId, userId]
    );

    if (!bookingResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Active booking not found.' });
    }

    const booking = bookingResult.rows[0];
    const now = new Date();
    const durationMins = Math.round((now - new Date(booking.in_time)) / 60000);

    // Update booking
    await client.query(
      `UPDATE bookings
       SET status = 'completed', out_time = NOW(), duration_minutes = $1
       WHERE id = $2`,
      [durationMins, booking.id]
    );

    // Free slot
    await client.query(
      `UPDATE slots SET status = 'free'
       WHERE counter_name = $1 AND slot_number = $2`,
      [booking.counter_name, booking.slot_number]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Slot ${booking.counter_name}-${booking.slot_number} released.`,
      duration: durationMins
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/slots/quick-book — no auth, by reg number
router.post('/quick-book', async (req, res) => {
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');
    const { regNumber, counterName } = req.body;

    if (!regNumber || !counterName) {
      return res.status(400).json({ success: false, message: 'regNumber and counterName are required.' });
    }

    const reg = regNumber.toUpperCase();

    // Check existing active booking
    const existing = await client.query(
      `SELECT id, counter_name, slot_number FROM bookings WHERE reg_number = $1 AND status = 'active'`,
      [reg]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `Already has active slot: ${existing.rows[0].counter_name}-${existing.rows[0].slot_number}`
      });
    }

    // Get free slot
    const freeSlot = await client.query(
      `SELECT id, slot_number FROM slots WHERE counter_name = $1 AND status = 'free' ORDER BY RANDOM() LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [counterName]
    );

    if (!freeSlot.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'No slots available.' });
    }

    const slot = freeSlot.rows[0];
    await client.query(`UPDATE slots SET status = 'occupied' WHERE id = $1`, [slot.id]);

    const booking = await client.query(
      `INSERT INTO bookings (user_id, reg_number, username, counter_name, slot_number, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
      [reg, reg, reg, counterName, slot.slot_number]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      booking: booking.rows[0],
      message: `Slot allocated: ${counterName}-${slot.slot_number}`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/slots/quick-release
router.post('/quick-release', async (req, res) => {
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');
    const { regNumber } = req.body;
    const reg = regNumber?.toUpperCase();

    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE reg_number = $1 AND status = 'active'`,
      [reg]
    );

    if (!bookingResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'No active slot found for this registration number.' });
    }

    const booking = bookingResult.rows[0];
    const durationMins = Math.round((new Date() - new Date(booking.in_time)) / 60000);

    await client.query(
      `UPDATE bookings SET status = 'completed', out_time = NOW(), duration_minutes = $1 WHERE id = $2`,
      [durationMins, booking.id]
    );
    await client.query(
      `UPDATE slots SET status = 'free' WHERE counter_name = $1 AND slot_number = $2`,
      [booking.counter_name, booking.slot_number]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Released ${booking.counter_name}-${booking.slot_number}`, duration: durationMins });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// GET /api/slots/my-booking/:userId — authenticated
router.get('/my-booking/:userId', protect, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM bookings WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [req.params.userId]
    );
    res.json({ success: true, booking: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/slots/history/:userId — authenticated
router.get('/history/:userId', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [result, count] = await Promise.all([
      query(
        `SELECT * FROM bookings WHERE user_id = $1 ORDER BY in_time DESC LIMIT $2 OFFSET $3`,
        [req.params.userId, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM bookings WHERE user_id = $1`, [req.params.userId])
    ]);

    res.json({
      success: true,
      history: result.rows,
      total: parseInt(count.rows[0].count),
      page,
      pages: Math.ceil(count.rows[0].count / limit)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
