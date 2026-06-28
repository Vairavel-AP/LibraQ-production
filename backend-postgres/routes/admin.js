const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { protect } = require('../middleware/auth');

// All admin routes require authentication (role check done at app level via token)

// GET /api/admin/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [bookings, active, freeSlots, users] = await Promise.all([
      query(`SELECT COUNT(*) FROM bookings WHERE status != 'reset'`),
      query(`SELECT COUNT(*) FROM bookings WHERE status = 'active'`),
      query(`SELECT COUNT(*) FROM slots WHERE status = 'free'`),
      query(`SELECT COUNT(DISTINCT user_id) FROM bookings`)
    ]);

    const todayBookings = await query(
      `SELECT COUNT(*) FROM bookings WHERE DATE(in_time) = CURRENT_DATE AND status != 'reset'`
    );

    const counterStats = await query(`
      SELECT
        c.name,
        c.label,
        COUNT(CASE WHEN s.status = 'free' THEN 1 END)::int AS free,
        COUNT(CASE WHEN s.status = 'occupied' THEN 1 END)::int AS occupied
      FROM counters c
      LEFT JOIN slots s ON s.counter_name = c.name
      GROUP BY c.name, c.label
      ORDER BY c.name
    `);

    res.json({
      success: true,
      stats: {
        totalBookings: parseInt(bookings.rows[0].count),
        activeBookings: parseInt(active.rows[0].count),
        freeSlots: parseInt(freeSlots.rows[0].count),
        uniqueUsers: parseInt(users.rows[0].count),
        todayBookings: parseInt(todayBookings.rows[0].count),
        counters: counterStats.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/bookings — paginated
router.get('/bookings', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || null;
    const counter = req.query.counter || null;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) { params.push(status); whereClause += ` AND status = $${params.length}`; }
    if (counter) { params.push(counter); whereClause += ` AND counter_name = $${params.length}`; }

    const [result, count] = await Promise.all([
      query(
        `SELECT * FROM bookings ${whereClause} ORDER BY in_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM bookings ${whereClause}`, params)
    ]);

    res.json({
      success: true,
      bookings: result.rows,
      total: parseInt(count.rows[0].count),
      page,
      pages: Math.ceil(count.rows[0].count / limit)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/active-bookings
router.get('/active-bookings', protect, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM bookings WHERE status = 'active' ORDER BY in_time ASC`
    );
    res.json({ success: true, bookings: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/reset — reset all active slots
router.post('/reset', protect, async (req, res) => {
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE bookings SET status = 'reset', out_time = NOW() WHERE status = 'active'`
    );
    await client.query(`UPDATE slots SET status = 'free'`);

    await client.query('COMMIT');
    res.json({ success: true, message: 'All slots have been reset.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// POST /api/admin/release/:bookingId — admin force release
router.post('/release/:bookingId', protect, async (req, res) => {
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');

    const booking = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND status = 'active'`,
      [req.params.bookingId]
    );

    if (!booking.rows.length) {
      return res.status(404).json({ success: false, message: 'Active booking not found.' });
    }

    const b = booking.rows[0];
    const dur = Math.round((new Date() - new Date(b.in_time)) / 60000);

    await client.query(
      `UPDATE bookings SET status = 'completed', out_time = NOW(), duration_minutes = $1, notes = 'Admin released' WHERE id = $2`,
      [dur, b.id]
    );
    await client.query(
      `UPDATE slots SET status = 'free' WHERE counter_name = $1 AND slot_number = $2`,
      [b.counter_name, b.slot_number]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Released ${b.counter_name}-${b.slot_number}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// GET /api/admin/analytics
router.get('/analytics', protect, async (req, res) => {
  try {
    const [byDay, byCounter, topUsers, peakHours] = await Promise.all([
      query(`
        SELECT DATE(in_time) as date, COUNT(*)::int as bookings
        FROM bookings WHERE status != 'reset' AND in_time > NOW() - INTERVAL '30 days'
        GROUP BY DATE(in_time) ORDER BY date DESC LIMIT 30
      `),
      query(`
        SELECT counter_name, COUNT(*)::int as bookings,
               ROUND(AVG(duration_minutes))::int as avg_duration
        FROM bookings WHERE status != 'reset'
        GROUP BY counter_name ORDER BY bookings DESC
      `),
      query(`
        SELECT username, reg_number, COUNT(*)::int as total_bookings
        FROM bookings WHERE status != 'reset'
        GROUP BY username, reg_number ORDER BY total_bookings DESC LIMIT 10
      `),
      query(`
        SELECT EXTRACT(HOUR FROM in_time)::int as hour, COUNT(*)::int as bookings
        FROM bookings WHERE status != 'reset'
        GROUP BY hour ORDER BY hour
      `)
    ]);

    res.json({
      success: true,
      analytics: {
        bookingsByDay: byDay.rows,
        bookingsByCounter: byCounter.rows,
        topUsers: topUsers.rows,
        peakHours: peakHours.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/counter/:name/toggle
router.patch('/counter/:name/toggle', protect, async (req, res) => {
  try {
    const result = await query(
      `UPDATE counters SET is_active = NOT is_active WHERE name = $1 RETURNING *`,
      [req.params.name]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Counter not found.' });
    res.json({ success: true, counter: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
