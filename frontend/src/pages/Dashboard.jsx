import { useState, useEffect, useCallback } from 'react';
import { slotsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { RefreshCw, MapPin, Clock, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [counters, setCounters] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [availRes, bookingRes] = await Promise.all([
        slotsAPI.get('/api/slots/availability'),
        slotsAPI.get(`/api/slots/my-booking/${user._id}`)
      ]);
      setCounters(availRes.data.counters);
      setActiveBooking(bookingRes.data.booking);
    } catch (err) {
      toast.error('Failed to load data.');
    } finally { setLoading(false); }
  }, [user._id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleBook = async (counterName) => {
    if (activeBooking) return toast.error('You already have an active slot!');
    setBooking(counterName);
    try {
      const res = await slotsAPI.post('/api/slots/book', {
        counterName, userId: user._id, regNumber: user.regNumber, username: user.username
      });
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed.');
    } finally { setBooking(false); }
  };

  const handleRelease = async () => {
    if (!activeBooking) return;
    setReleasing(true);
    try {
      const res = await slotsAPI.post('/api/slots/release', {
        userId: user._id, bookingId: activeBooking.id
      });
      toast.success(res.data.message);
      setActiveBooking(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Release failed.');
    } finally { setReleasing(false); }
  };

  const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

  if (loading) return (
    <div className="page"><Navbar /><div className="loading-screen"><div className="spinner" /></div></div>
  );

  return (
    <div className="page fade-in">
      <Navbar />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <div className="flex-between mb-6">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Good day, <span className="text-accent">{user.username}</span> 👋</h1>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>{user.regNumber}</p>
          </div>
          <button onClick={fetchData} className="btn btn-outline btn-sm"><RefreshCw size={14} /> Refresh</button>
        </div>

        {activeBooking ? (
          <div className="active-slot-banner mb-6">
            <div className="active-slot-info">
              <CheckCircle size={20} color="var(--success)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Active Slot</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                  <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Since {formatTime(activeBooking.in_time)}
                </div>
              </div>
              <div className="slot-badge">{activeBooking.counter_name}-{activeBooking.slot_number}</div>
            </div>
            <button onClick={handleRelease} disabled={releasing} className="btn btn-warning btn-sm">
              {releasing ? 'Releasing...' : 'Release Slot'}
            </button>
          </div>
        ) : (
          <div style={{
            background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius)', padding: '14px 20px', marginBottom: 24,
            fontSize: '0.875rem', color: 'var(--warning)'
          }}>
            No active slot. Select a counter below to book one.
          </div>
        )}

        <div className="section-header">
          <h2 className="section-title"><MapPin size={18} style={{ display: 'inline', marginRight: 6 }} />Select Counter</h2>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Auto-refreshes every 30s</span>
        </div>

        <div className="counters-grid">
          {counters.map(c => {
            const pct = Math.round((c.free_slots / c.total_slots) * 100);
            const isBooking = booking === c.name;
            return (
              <div
                key={c.name}
                className={`counter-card ${!c.is_active || activeBooking ? 'inactive' : ''}`}
                onClick={() => c.is_active && !activeBooking && handleBook(c.name)}
                role="button" tabIndex={0}
              >
                <div className="counter-letter">{isBooking ? '...' : c.name}</div>
                <div className="counter-label">{c.description}</div>
                <div className="counter-slots">
                  <div>
                    <div className="counter-free">{c.free_slots}</div>
                    <div className="counter-total">of {c.total_slots} free</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: pct > 20 ? 'var(--success)' : 'var(--danger)' }}>{pct}%</div>
                    <div className="counter-total">available</div>
                  </div>
                </div>
                <div className="slot-bar">
                  <div className="slot-fill" style={{ width: `${pct}%`, background: pct > 20 ? 'var(--success)' : 'var(--danger)' }} />
                </div>
                {!c.is_active && <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--danger)' }}>Counter inactive</div>}
                {isBooking && <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--accent-light)' }}>Booking...</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
