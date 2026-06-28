import { useState } from 'react';
import { slotsAPI } from '../utils/api';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function QuickRelease() {
  const [regNumber, setRegNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const res = await slotsAPI.post('/api/slots/quick-release', { regNumber });
      setResult({ success: true, message: res.data.message, duration: res.data.duration });
      setRegNumber('');
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Release failed.' });
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page fade-in">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: 40 }}>🔓</div>
          <h2>Quick Release</h2>
          <p>Release your slot by entering your registration number</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Registration Number</label>
            <input className="input" placeholder="e.g. 23BCE1234" value={regNumber}
              onChange={e => setRegNumber(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-warning btn-block btn-lg" disabled={loading}>
            {loading ? 'Releasing...' : 'Release Slot'}
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
                {result.success ? 'Slot Released!' : 'Error'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>{result.message}</div>
              {result.duration != null && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>Duration: {result.duration} minutes</div>
              )}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
          <Link to="/quick-entry" className="btn btn-outline btn-sm">Quick Entry</Link>
          <Link to="/" className="btn btn-ghost btn-sm">← Home</Link>
        </div>
      </div>
    </div>
  );
}
