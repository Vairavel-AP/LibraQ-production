import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Shield } from 'lucide-react';

export default function AdminLogin() {
  const { adminLogin, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user?.role === 'admin') {
    navigate('/admin/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await adminLogin(form.username, form.password);
      toast.success('Admin logged in.');
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid admin credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page fade-in">
      <div className="auth-card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
        <div className="auth-logo">
          <Shield size={48} color="var(--danger)" />
          <h2>Admin Access</h2>
          <p>Restricted to authorised staff only</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Admin Username</label>
            <input className="input" placeholder="Username" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          {error && <div className="error-text mb-4" style={{ marginBottom: 16 }}>{error}</div>}
          <button type="submit" className="btn btn-danger btn-block btn-lg" disabled={loading}>
            {loading ? 'Authenticating...' : 'Admin Login'}
          </button>
        </form>
        <p className="text-center mt-4">
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>← Back to home</Link>
        </p>
        <p className="text-center mt-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Default: admin / admin@123
        </p>
      </div>
    </div>
  );
}
