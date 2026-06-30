# 📚 LibraQ — Smart Library Token System

A full-stack **MERN + PERN** web application for managing library bag-token slots at VIT. Students can book and release counters in real-time; admins get a live dashboard with analytics.

🔗 **Live App:** [https://libraq.vercel.app](https://libraq.vercel.app)

---

## 🧩 The Problem

VIT Library has no digital system for managing bag-token slots at entry counters. Students queue physically, staff track availability on paper, and there's no record of who is occupying which slot or for how long. LibraQ replaces this entirely with a real-time digital token system.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                  │
│                                                                          │
│              ┌───────────────────────────────────────┐                  │
│              │     React + Vite  (Vercel — Live)       │                  │
│              │  Dashboard · Profile · Admin · Quick    │                  │
│              └───────────────────────────────────────┘                  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │  HTTPS
┌────────────────────────────────▼─────────────────────────────────────────┐
│                            GATEWAY LAYER                                 │
│                                                                          │
│         ┌────────────────────────────────────────────────┐              │
│         │     Two independent REST APIs (env-based URLs)  │              │
│         │   VITE_AUTH_URL   → Auth Service  (Render)       │              │
│         │   VITE_SLOTS_URL  → Slots Service (Render)       │              │
│         └────────────────────────────────────────────────┘              │
└──────────────────┬──────────────────────────────────────┬────────────────┘
                   │                                       │
        ┌──────────▼──────────┐               ┌───────────▼──────────┐
        │  ██ AUTH SERVICE    │               │  ██ SLOTS SERVICE     │
        │  Node + Express     │               │  Node + Express       │
        │  Hosted on Render   │               │  Hosted on Render     │
        │  (MERN)             │               │  (PERN)               │
        │  ─────────────────  │               │  ──────────────────── │
        │  POST /auth/login   │               │  POST /slots/book     │
        │  POST /auth/reg     │               │  POST /slots/release  │
        │  GET  /auth/me      │               │  POST /slots/quick-*  │
        │  PUT  /upload-photo │               │  GET  /admin/stats    │
        │  GET  /auth/users   │               │  GET  /admin/analytics│
        │  ─────────────────  │               │  ──────────────────── │
        │  JWT · bcrypt       │               │  SKIP LOCKED          │
        │  multer · mongoose  │               │  ACID transactions    │
        └──────────┬──────────┘               └───────────┬───────────┘
                   │                                       │
        ┌──────────▼──────────┐               ┌───────────▼───────────┐
        │  ▣ MONGODB ATLAS    │               │  ▣ NEON POSTGRESQL     │
        │  Cloud-hosted       │               │  Cloud-hosted          │
        │  DB: vit_library    │               │  DB: vit_library       │
        │  ─────────────────  │               │  ──────────────────── │
        │  users collection   │               │  counters table        │
        │   · _id             │               │  slots table           │
        │   · username        │               │  bookings table        │
        │   · regNumber       │               │  daily_stats view      │
        │   · password(hash)  │               │  indexes on user_id,   │
        │   · role            │               │  status, counter_name  │
        │   · profileImage    │               │                        │
        └─────────────────────┘               └────────────────────────┘
```

### Why Two Databases?

| Concern | MongoDB | PostgreSQL |
|---|---|---|
| Data type | Flexible user profiles / docs | Structured relational slot data |
| Key strength | Schema-less, fast auth ops | ACID transactions, row locking |
| Critical feature | JWT + bcrypt auth, file uploads | `SKIP LOCKED` prevents double-booking |

**Why two backends?**
- **MongoDB** is ideal for flexible user profiles, authentication, and document-style data.
- **PostgreSQL** is ideal for slot management — ACID transactions prevent double-booking with row-level locking.

---

### Request Flow — Booking a Slot

```
Student taps "Book Counter A"
      │
      ▼
React → POST /api/slots/book
      │
      ▼
Slots Service (Render)
      │
      ├─ BEGIN TRANSACTION
      ├─ Check active booking for user_id
      ├─ SELECT free slot FOR UPDATE SKIP LOCKED  ← prevents race condition
      ├─ UPDATE slot → 'occupied'
      ├─ INSERT into bookings
      └─ COMMIT → return { counter: 'A', slot: 42 }
```

### Request Flow — Authentication

```
Student submits login form
      │
      ▼
React → POST /api/auth/login
      │
      ▼
Auth Service (Render)
      │
      ├─ Find user by username in MongoDB
      ├─ bcrypt.compare(password, hash)
      ├─ Sign JWT { id, role, isAdmin }
      └─ Return token + user object
              │
              ▼
   Token stored in localStorage
   Attached to every request via Axios interceptor
   Verified independently by BOTH services
```

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

## 🔑 Default Credentials

| Role | Username | Password |
|---|---|---|
| Admin | admin | admin@123 |

Students self-register at `/register`.

---

## 📡 API Reference

### Auth Service

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Student registration |
| POST | `/api/auth/login` | Student login |
| POST | `/api/auth/admin-login` | Admin login |
| GET | `/api/auth/me` | Get current user (auth) |
| PUT | `/api/auth/upload-photo` | Update profile photo (auth) |
| GET | `/api/auth/users` | List all users (admin) |
| PATCH | `/api/auth/users/:id/toggle` | Toggle user status (admin) |

### Slots Service

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/slots/availability` | Counter availability (public) |
| POST | `/api/slots/book` | Book a slot (auth) |
| POST | `/api/slots/release` | Release slot (auth) |
| POST | `/api/slots/quick-book` | Book by reg number (public) |
| POST | `/api/slots/quick-release` | Release by reg number (public) |
| GET | `/api/slots/my-booking/:userId` | Active booking (auth) |
| GET | `/api/slots/history/:userId` | Booking history (auth) |
| GET | `/api/admin/stats` | System stats (admin) |
| GET | `/api/admin/analytics` | Analytics data (admin) |
| GET | `/api/admin/active-bookings` | Live active slots (admin) |
| GET | `/api/admin/bookings` | All bookings paginated (admin) |
| POST | `/api/admin/reset` | Reset all slots (admin) |
| POST | `/api/admin/release/:id` | Force release (admin) |
| PATCH | `/api/admin/counter/:name/toggle` | Toggle counter (admin) |

---

## 🗄️ Database Schema & Relationships

### MongoDB — `users` collection

```
users {
  _id            ObjectId   PK, auto-generated
  username       String     required, unique
  regNumber      String     required, unique, uppercase
  password       String     required, bcrypt hashed, select:false
  profileImage   String     filename, default null
  role           String     enum: student | admin, default student
  isActive       Boolean    default true
  lastLogin      Date       updated on every login
  createdAt      Date       auto (timestamps)
  updatedAt      Date       auto (timestamps)
}
```

### PostgreSQL — relational schema

```sql
counters  (name PK, label, description, total_slots, is_active, created_at)
slots     (id PK, counter_name FK→counters.name, slot_number, status)
bookings  (id PK, user_id, reg_number, username, counter_name FK→counters.name,
           slot_number, in_time, out_time, duration_minutes, status, notes, created_at)
```

### Relationship Mappings

```
counters ──< slots          (one counter → 100 slots, FK on counter_name)
counters ──< bookings       (one counter → many bookings over time)
slots    ─── bookings       (logical link, managed via SKIP LOCKED transaction,
                              not a hard FK — preserves history after reset)
users    ─── bookings       (cross-database link: bookings.user_id stores
(MongoDB)   (PostgreSQL)     the MongoDB _id as a plain string)
```

| Relationship | Cardinality | Enforced by |
|---|---|---|
| counter → slots | 1 : 100 | FK + seed script |
| counter → bookings | 1 : many | FK on counter_name |
| user → bookings | 1 : many | `user_id` string (cross-DB) |
| slot → active booking | 1 : 0 or 1 | `SKIP LOCKED` transaction |

### Why no hard FK from `bookings` → `slots`?

The `SKIP LOCKED` row-level lock pattern works at the transaction level — acquiring a lock on a free slot row, marking it occupied, and inserting the booking atomically — which is stronger than a FK constraint for concurrency control. Denormalising `slot_number` into `bookings` also preserves history even after a slot row is reset to free.

---

## 🛡️ Security Features

- Bcrypt password hashing (cost 12)
- JWT auth with configurable expiry, role embedded in token payload
- PostgreSQL row-level locking (`SKIP LOCKED`) prevents double-booking
- Input validation on all routes
- CORS restricted to the deployed frontend origin (and Vercel preview URLs)
- User account disable/enable by admin

---

## ☁️ Hosting & Infrastructure

| Layer | Service | Tier |
|---|---|---|
| Frontend | Vercel | Free |
| Auth Service | Render | Free |
| Slots Service | Render | Free |
| MongoDB | MongoDB Atlas | Free (M0, 512MB) |
| PostgreSQL | Neon | Free (0.5GB) |

**Total hosting cost: ₹0/month**

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
│   │   ├── utils/api.js
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
│   ├── vercel.json
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## 🧰 Tech Stack

```
Frontend   : React.js, Vite, React Router, Recharts, Axios, Lucide Icons
Backend    : Node.js, Express.js (two independent microservices)
Databases  : MongoDB (Atlas), PostgreSQL (Neon)
Auth       : JWT, bcrypt, role-based access control
DevOps     : Vercel, Render, Docker, Git, GitHub
Libraries  : Multer, Mongoose, node-postgres (pg)
```

---

Built with ❤️ for VIT — turning a real-world problem into a production-grade solution.
