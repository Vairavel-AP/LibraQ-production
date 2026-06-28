import { useState, useEffect, useRef } from 'react';
import { authAPI, slotsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Camera, Clock, BookOpen, Star, History } from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [history, setHistory] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [stats, setStats] = useState({ total: 0, favCounter: null });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [histRes, bookRes] = await Promise.all([
          slotsAPI.get(`/api/slots/history/${user._id}`),
          slotsAPI.get(`/api/slots/my-booking/${user._id}`)
        ]);
        const h = histRes.data.history;
        setHistory(h);
        setActiveBooking(bookRes.data.booking);
        const total = histRes.data.total;
        const counterCounts = h.reduce((acc, b) => { acc[b.counter_name] = (acc[b.counter_name] || 0) + 1; return acc; }, {});
        const favCounter = Object.entries(counterCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        setStats({ total, favCounter });
      } catch { toast.error('Failed to load profile data.'); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [user._id]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await authAPI.put('/api/auth/upload-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser(res.data.user);
      toast.success('Photo updated!');
    } catch { toast.error('Upload failed.'); }
    finally { setUploading(false); }
  };

  const handleRelease = async () => {
    if (!activeBooking) return;
    setReleasing(true);
    try {
      await slotsAPI.post('/api/slots/release', { userId: user._id, bookingId: activeBooking.id });
      toast.success('Slot released!');
      setActiveBooking(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Release failed.'); }
    finally { setReleasing(false); }
  };

  const fmt = (t) => t ? new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const UPLOADS_BASE = import.meta.env.VITE_AUTH_URL || '';

  if (loading) return <div className="page"><Navbar /><div className="loading-screen"><div className="spinner" /></div></div>;

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div className="page fade-in">
      <Navbar />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 24 }}>My Profile</h1>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card text-center">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative', width: 'fit-content', margin: '0 auto 16px' }}>
                {user.profileImage
                  ? <img src={`${UPLOADS_BASE}/uploads/${user.profileImage}`} className="profile-avatar" alt="Profile" />
                  : <div className="profile-avatar-placeholder">{initials}</div>}
                <button className="btn btn-icon btn-primary" onClick={() => fileRef.current.click()} disabled={uploading}
                  style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, padding: 0 }}>
                  <Camera size={13} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user.username}</h3>
              <div className="text-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginTop: 4 }}>{user.regNumber}</div>
              {uploading && <div className="text-accent mt-2" style={{ fontSize: '0.8rem' }}>Uploading...</div>}
            </div>

            <div className="card">
              <h4 style={{ fontWeight: 600, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}><BookOpen size={16} /> Statistics</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[{ label: 'Total Bookings', value: stats.total, icon: <Clock size={14} /> },
                  { label: 'Fav Counter', value: stats.favCounter || '—', icon: <Star size={14} /> }
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>{s.icon}{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.25rem' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {activeBooking && (
              <div className="card" style={{ borderColor: 'rgba(34, 197, 94, 0.3)', background: 'var(--success-bg)' }}>
                <h4 style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 12 }}>Active Slot</h4>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
                  {activeBooking.counter_name}-{activeBooking.slot_number}
                </div>
                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 16 }}>Since {fmt(activeBooking.in_time)}</div>
                <button className="btn btn-warning btn-block" onClick={handleRelease} disabled={releasing}>
                  {releasing ? 'Releasing...' : 'Release Slot'}
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <h4 style={{ fontWeight: 600, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}><History size={16} /> Booking History</h4>
            {history.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: 32 }}>No bookings yet.</div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Slot</th><th>In</th><th>Out</th><th>Duration</th><th>Status</th></tr></thead>
                  <tbody>
                    {history.map(b => (
                      <tr key={b.id}>
                        <td><span className="mono" style={{ fontWeight: 700 }}>{b.counter_name}-{b.slot_number}</span></td>
                        <td style={{ fontSize: '0.8rem' }}>{fmt(b.in_time)}</td>
                        <td style={{ fontSize: '0.8rem' }}>{b.out_time ? fmt(b.out_time) : '—'}</td>
                        <td className="mono" style={{ fontSize: '0.8rem' }}>{b.duration_minutes != null ? `${b.duration_minutes}m` : '—'}</td>
                        <td><span className={`badge ${b.status === 'active' ? 'badge-success' : b.status === 'completed' ? 'badge-primary' : 'badge-warning'}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
