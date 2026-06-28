# 📚 VIT Library Token Management System

A full-stack **MERN + PERN** web application for managing library bag-token slots at VIT. Students can book and release counters in real-time; admins get a live dashboard with analytics.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│              React + Vite Frontend  (Port 5173)          │
└────────────┬──────────────────────────┬──────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────┐      ┌───────────────────────┐
│  Auth Service      │      │   Slots Service        │
│  Node + Express    │      │   Node + Express       │
│  Port 5001         │      │   Port 5002            │
│  MongoDB           │      │   PostgreSQL           │
│  (Users, Auth,     │      │   (Slots, Bookings,    │
│   Profiles)        │      │    Counters, Analytics)│
└────────────────────┘      └───────────────────────┘
```

**Why two backends?**
- **MongoDB** is ideal for flexible user profiles, authentication, and document-style data.
- **PostgreSQL** is ideal for slot management — ACID transactions prevent double-booking with row-level locking.

---

## ✨ Features

### Student Portal
- Register & login with JWT auth
- Real-time counter availability with slot bars
- One-click slot booking per student
- Slot release from dashboard or profile
- Booking history with duration tracking
- Profile photo upload
- Quick Entry (no login) via reg number
- Quick Release via reg number

### Admin Panel
- Login with separate admin credentials
- Live overview: active bookings, free slots, today's count
- Force-release any active slot
- Full booking history with filters
- User management (enable/disable accounts)
- Analytics: bookings by day (30-day chart), peak hours, bookings by counter, top 10 students

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- PostgreSQL 15+

### 1. Clone / unzip the project

### 2. Auth Service (MongoDB)
```bash
cd backend-mongo
cp .env.example .env       # Edit with your MONGO_URI
npm install
npm run dev                # Starts on :5001
```

### 3. Slots Service (PostgreSQL)
```bash
cd backend-postgres
cp .env.example .env       # Edit with your DATABASE_URL
npm install
npm run migrate            # Create tables
npm run seed               # Seed 4 counters × 100 slots
npm run dev                # Starts on :5002
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev                # Starts on :5173 with proxy
```

---

## 🐳 Docker (Full Stack)

```bash
# From project root
docker-compose up --build
```

App available at `http://localhost:5173`

---

## 🔑 Default Credentials

| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | admin    | admin@123 |

Students self-register at `/register`.

---

## 📡 API Reference

### Auth Service (`localhost:5001`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Student registration |
| POST | `/api/auth/login` | Student login |
| POST | `/api/auth/admin-login` | Admin login |
| GET  | `/api/auth/me` | Get current user (auth) |
| PUT  | `/api/auth/upload-photo` | Update profile photo (auth) |
| GET  | `/api/auth/users` | List all users (admin) |
| PATCH| `/api/auth/users/:id/toggle` | Toggle user status (admin) |

### Slots Service (`localhost:5002`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/slots/availability` | Counter availability (public) |
| POST | `/api/slots/book` | Book a slot (auth) |
| POST | `/api/slots/release` | Release slot (auth) |
| POST | `/api/slots/quick-book` | Book by reg number (public) |
| POST | `/api/slots/quick-release` | Release by reg number (public) |
| GET  | `/api/slots/my-booking/:userId` | Active booking (auth) |
| GET  | `/api/slots/history/:userId` | Booking history (auth) |
| GET  | `/api/admin/stats` | System stats (admin) |
| GET  | `/api/admin/analytics` | Analytics data (admin) |
| GET  | `/api/admin/active-bookings` | Live active slots (admin) |
| GET  | `/api/admin/bookings` | All bookings paginated (admin) |
| POST | `/api/admin/reset` | Reset all slots (admin) |
| POST | `/api/admin/release/:id` | Force release (admin) |
| PATCH| `/api/admin/counter/:name/toggle` | Toggle counter (admin) |

---

## 🗄️ Database Schema

### MongoDB (Users)
```
users {
  _id, username (unique), regNumber (unique),
  password (hashed), profileImage, role, isActive,
  lastLogin, createdAt, updatedAt
}
```

### PostgreSQL (Slots & Bookings)
```sql
counters  (name, label, description, total_slots, is_active)
slots     (id, counter_name, slot_number, status)
bookings  (id, user_id, reg_number, username, counter_name,
           slot_number, in_time, out_time, duration_minutes, status)
```

---

## 🛡️ Security Features
- Bcrypt password hashing (cost 12)
- JWT auth with configurable expiry
- PostgreSQL row-level locking (SKIP LOCKED) prevents double-booking
- Input validation on all routes
- CORS configured per service
- User account disable/enable

---

## 📁 Project Structure

```
vit-library/
├── backend-mongo/          # MERN auth service
│   ├── models/User.js
│   ├── middleware/auth.js
│   ├── routes/auth.js
│   ├── server.js
│   └── Dockerfile
├── backend-postgres/       # PERN slots service
│   ├── db/index.js
│   ├── middleware/auth.js
│   ├── routes/slots.js
│   ├── routes/admin.js
│   ├── scripts/migrate.js
│   ├── scripts/seed.js
│   ├── server.js
│   └── Dockerfile
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── context/AuthContext.jsx
│   │   ├── components/Navbar.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── QuickEntry.jsx
│   │   │   ├── QuickRelease.jsx
│   │   │   ├── AdminLogin.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

Built with ❤️ for VIT — turning a real-world problem into a production-grade solution.
