import { Link } from 'react-router-dom';
import { BookOpen, Zap, LogIn, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="home-page fade-in">
      <div className="home-card">
        <div className="home-logo">📚</div>
        <h1 className="home-title">VIT Library Token System</h1>
        <p className="home-subtitle">Smart bag-token management for VIT Library — book, track, and release slots in seconds.</p>

        <div className="home-actions">
          <Link to="/login" className="btn btn-primary btn-lg">
            <LogIn size={18} /> Student Login
          </Link>
          <Link to="/register" className="btn btn-outline btn-lg">
            <BookOpen size={18} /> Create Account
          </Link>
          <hr className="home-divider" />
          <Link to="/quick-entry" className="btn btn-secondary btn-lg">
            <Zap size={18} /> Quick Entry (QR)
          </Link>
          <Link to="/quick-release" className="btn btn-warning btn-lg">
            Quick Release
          </Link>
          <hr className="home-divider" />
          <Link to="/admin" className="btn btn-ghost btn-sm">
            <Shield size={14} /> Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
