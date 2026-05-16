import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';

const NAV = [
  { to: '/dashboard', emoji: '🏠', label: 'Dashboard' },
  { to: '/sales',     emoji: '🛒', label: 'Sotuv' },
  { to: '/products',  emoji: '📦', label: 'Mahsulotlar' },
  { to: '/customers', emoji: '👥', label: 'Mijozlar' },
  { to: '/warehouse', emoji: '🏪', label: 'Sklad' },
  { to: '/payments',  emoji: '💳', label: "To'lovlar" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">🛒</span>
        <span>Savdo CRM</span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link--active' : '')}
          >
            <span className="nav-emoji">{item.emoji}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-theme-toggle" onClick={toggle}>
          {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
        </button>
        <div className="sidebar-user">
          <span className="sidebar-user-avatar">{user?.email?.[0]?.toUpperCase() ?? 'U'}</span>
          <span className="sidebar-email">{user?.email}</span>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>Chiqish</button>
      </div>
    </aside>
  );
}
