require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure upload dir exists
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// CORS — allow Vercel frontend + localhost dev
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return callback(null, true);
    // Allow any *.vercel.app preview URL
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// Routes
app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'mongo-auth', time: new Date() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5001;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Auth service running on port ${PORT}`));
    seedAdmin();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

async function seedAdmin() {
  const User = require('./models/User');
  const existing = await User.findOne({ role: 'admin' });
  if (!existing) {
    await User.create({
      username: 'admin',
      regNumber: 'ADMIN001',
      password: 'admin@123',
      role: 'admin'
    });
    console.log('👤 Default admin created: admin / admin@123');
  }
}
