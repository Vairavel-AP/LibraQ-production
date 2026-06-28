import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, LayoutDashboard, BookOpen } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="navbar">
      <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
        <div className="logo-icon">📚</div>
        VIT Library
      </Link>
      <div className="navbar-nav">
        {user ? (
          <>
            <Link to="/dashboard" className="btn btn-ghost btn-sm">
              <LayoutDashboard size={15} /> Dashboard
            </Link>
            <Link to="/profile" className="btn btn-ghost btn-sm">
              <User size={15} /> Profile
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin/dashboard" className="btn btn-outline btn-sm">
                Admin Panel
              </Link>
            )}
            <button onClick={handleLogout} className="btn btn-danger btn-sm">
              <LogOut size={15} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
