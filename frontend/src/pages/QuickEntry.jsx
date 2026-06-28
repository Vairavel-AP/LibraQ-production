import { useState } from 'react';
import { slotsAPI } from '../utils/api';
import { Link } from 'react-router-dom';
import { Zap, CheckCircle, AlertCircle } from 'lucide-react';

export default function QuickEntry() {
  const [form, setForm] = useState({ regNumber: '', counterName: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const res = await slotsAPI.post('/api/slots/quick-book', form);
      setResult({ success: true, message: res.data.message, booking: res.data.booking });
      setForm({ regNumber: '', counterName: '' });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Booking failed.' });
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page fade-in">
      <div className="auth-card">
        <div className="auth-logo">
          <Zap size={48} color="var(--accent)" />
          <h2>Quick Entry</h2>
          <p>Book a slot without logging in</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Registration Number</label>
            <input className="input" placeholder="e.g. 23BCE1234" value={form.regNumber}
              onChange={e => setForm(f => ({ ...f, regNumber: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="label">Counter</label>
            <select className="select" value={form.counterName}
              onChange={e => setForm(f => ({ ...f, counterName: e.target.value }))} required>
              <option value="">Select Counter</option>
              {['A', 'B', 'C', 'D'].map(c => <option key={c} value={c}>Counter {c}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            <Zap size={16} /> {loading ? 'Getting slot...' : 'Get Slot'}
          </button>
        </form>
        {result && (
          <div style={{
            marginTop: 20, padding: '14px 18px', borderRadius: 'var(--radius-sm)',
            background: result.success ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${result.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            {result.success ? <CheckCircle size={18} color="var(--success)" /> : <AlertCircle size={18} color="var(--danger)" />}
            <div>
              <div style={{ fontWeight: 600, color: result.success ? 'var(--success)' : 'var(--danger)' }}>
                {result.success ? 'Slot Allocated!' : 'Booking Failed'}
              </div>
              {result.booking && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
                  {result.booking.counter_name}-{result.booking.slot_number}
                </div>
              )}
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>{result.message}</div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
          <Link to="/quick-release" className="btn btn-outline btn-sm">Quick Release</Link>
          <Link to="/" className="btn btn-ghost btn-sm">← Home</Link>
        </div>
      </div>
    </div>
  );
}
