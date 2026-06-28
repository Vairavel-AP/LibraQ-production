import { useState, useEffect, useCallback } from 'react';
import { authAPI, slotsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, CheckSquare, Activity, RefreshCw, LogOut, RotateCcw, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeBookings, setActiveBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, analyticsRes, activeRes] = await Promise.all([
        slotsAPI.get('/api/admin/stats'),
        slotsAPI.get('/api/admin/analytics'),
        slotsAPI.get('/api/admin/active-bookings')
      ]);
      setStats(statsRes.data.stats);
      setAnalytics(analyticsRes.data.analytics);
      setActiveBookings(activeRes.data.bookings);
    } catch { toast.error('Failed to load stats.'); }
    finally { setLoading(false); }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await slotsAPI.get('/api/admin/bookings?limit=50');
      setAllBookings(res.data.bookings);
    } catch { toast.error('Failed to load bookings.'); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authAPI.get('/api/auth/users?limit=50');
      setUsers(res.data.users);
    } catch { toast.error('Failed to load users.'); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (tab === 'bookings') fetchBookings();
    if (tab === 'users') fetchUsers();
  }, [tab, fetchBookings, fetchUsers]);

  const handleReset = async () => {
    if (!window.confirm('Reset ALL active slots? This cannot be undone.')) return;
    setResetting(true);
    try {
      await slotsAPI.post('/api/admin/reset');
      toast.success('All slots reset!');
      fetchStats();
    } catch { toast.error('Reset failed.'); }
    finally { setResetting(false); }
  };

  const handleForceRelease = async (bookingId) => {
    try {
      await slotsAPI.post(`/api/admin/release/${bookingId}`);
      toast.success('Slot released.');
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const handleToggleUser = async (userId) => {
    try {
      await authAPI.patch(`/api/auth/users/${userId}/toggle`);
      toast.success('User status updated.');
      fetchUsers();
    } catch { toast.error('Failed.'); }
  };

  const fmt = (t) => t ? new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const handleLogout = () => { logout(); navigate('/'); };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page fade-in">
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} color="var(--danger)" />
          <span style={{ fontWeight: 700 }}>Admin Panel</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>· {user?.username}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchStats} className="btn btn-outline btn-sm"><RefreshCw size={13} /></button>
          <button onClick={handleReset} disabled={resetting} className="btn btn-warning btn-sm">
            <RotateCcw size={13} /> {resetting ? 'Resetting...' : 'Reset All'}
          </button>
          <button onClick={handleLogout} className="btn btn-danger btn-sm"><LogOut size={13} /> Logout</button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="tabs">
          {[['overview','Overview'],['active','Active Slots'],['bookings','All Bookings'],['users','Users'],['analytics','Analytics']].map(([key, label]) => (
            <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>

        {tab === 'overview' && stats && (
          <>
            <div className="stats-grid mb-6">
              {[
                { label: 'Total Bookings', value: stats.totalBookings, icon: <BookOpen size={18} />, color: 'var(--accent)' },
                { label: 'Active Now', value: stats.activeBookings, icon: <Activity size={18} />, color: 'var(--success)' },
                { label: 'Free Slots', value: stats.freeSlots, icon: <CheckSquare size={18} />, color: 'var(--warning)' },
                { label: "Today's Bookings", value: stats.todayBookings, icon: <Users size={18} />, color: 'var(--info)' }
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div className="stat-label">{s.label}</div>
                    <div style={{ color: s.color }}>{s.icon}</div>
                  </div>
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Counter Status</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {stats.counters.map(c => {
                  const pct = Math.round((c.free / (c.free + c.occupied)) * 100) || 0;
                  return (
                    <div key={c.name} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-light)' }}>Counter {c.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: pct > 20 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.free} free · {c.occupied} occupied</div>
                      <div className="slot-bar" style={{ marginTop: 8 }}>
                        <div className="slot-fill" style={{ width: `${pct}%`, background: pct > 20 ? 'var(--success)' : 'var(--danger)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === 'active' && (
          <div className="card">
            <div className="flex-between mb-4">
              <h3 style={{ fontWeight: 600 }}>Active Bookings ({activeBookings.length})</h3>
              <button onClick={fetchStats} className="btn btn-outline btn-sm"><RefreshCw size={13} /> Refresh</button>
            </div>
            {activeBookings.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: 40 }}>No active bookings.</div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Slot</th><th>Student</th><th>Reg No.</th><th>In Time</th><th>Duration</th><th>Action</th></tr></thead>
                  <tbody>
                    {activeBookings.map(b => {
                      const dur = Math.round((new Date() - new Date(b.in_time)) / 60000);
                      return (
                        <tr key={b.id}>
                          <td><span className="mono" style={{ fontWeight: 700, color: 'var(--accent-light)' }}>{b.counter_name}-{b.slot_number}</span></td>
                          <td>{b.username}</td>
                          <td className="mono" style={{ fontSize: '0.85rem' }}>{b.reg_number}</td>
                          <td style={{ fontSize: '0.8rem' }}>{fmt(b.in_time)}</td>
                          <td className="mono">{dur}m</td>
                          <td><button className="btn btn-warning btn-sm" onClick={() => handleForceRelease(b.id)}>Release</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'bookings' && (
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>All Bookings</h3>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Slot</th><th>Student</th><th>Reg No.</th><th>In</th><th>Out</th><th>Duration</th><th>Status</th></tr></thead>
                <tbody>
                  {allBookings.map(b => (
                    <tr key={b.id}>
                      <td><span className="mono" style={{ fontWeight: 700 }}>{b.counter_name}-{b.slot_number}</span></td>
                      <td>{b.username}</td>
                      <td className="mono" style={{ fontSize: '0.85rem' }}>{b.reg_number}</td>
                      <td style={{ fontSize: '0.8rem' }}>{fmt(b.in_time)}</td>
                      <td style={{ fontSize: '0.8rem' }}>{fmt(b.out_time)}</td>
                      <td className="mono">{b.duration_minutes != null ? `${b.duration_minutes}m` : '—'}</td>
                      <td><span className={`badge ${b.status === 'active' ? 'badge-success' : b.status === 'completed' ? 'badge-primary' : 'badge-warning'}`}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Registered Users ({users.length})</h3>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Username</th><th>Reg No.</th><th>Role</th><th>Joined</th><th>Last Login</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 500 }}>{u.username}</td>
                      <td className="mono" style={{ fontSize: '0.85rem' }}>{u.regNumber}</td>
                      <td><span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-primary'}`}>{u.role}</span></td>
                      <td style={{ fontSize: '0.8rem' }}>{fmt(u.createdAt)}</td>
                      <td style={{ fontSize: '0.8rem' }}>{fmt(u.lastLogin)}</td>
                      <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-warning'}`}>{u.isActive ? 'Active' : 'Disabled'}</span></td>
                      <td>{u.role !== 'admin' && (
                        <button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => handleToggleUser(u._id)}>
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'analytics' && analytics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="grid-2">
              <div className="card">
                <h3 style={{ fontWeight: 600, marginBottom: 20 }}>Bookings by Counter</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.bookingsByCounter}>
                    <XAxis dataKey="counter_name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                    <Bar dataKey="bookings" fill="var(--accent)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 style={{ fontWeight: 600, marginBottom: 20 }}>Peak Hours</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.peakHours}>
                    <XAxis dataKey="hour" tickFormatter={h => `${h}:00`} stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip labelFormatter={h => `${h}:00`} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                    <Bar dataKey="bookings" fill="var(--info)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 20 }}>Bookings — Last 30 Days</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[...analytics.bookingsByDay].reverse()}>
                  <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                    stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  <Bar dataKey="bookings" fill="var(--success)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Top 10 Most Active Students</h3>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>#</th><th>Username</th><th>Reg No.</th><th>Total Bookings</th></tr></thead>
                  <tbody>
                    {analytics.topUsers.map((u, i) => (
                      <tr key={u.reg_number}>
                        <td className="mono" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{u.username}</td>
                        <td className="mono" style={{ fontSize: '0.85rem' }}>{u.reg_number}</td>
                        <td><span className="mono" style={{ fontWeight: 700, color: 'var(--accent-light)' }}>{u.total_bookings}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
