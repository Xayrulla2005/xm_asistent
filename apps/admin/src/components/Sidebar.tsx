import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tenants', label: 'Tenants' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">XM Admin</div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              'sidebar-link' + (isActive ? ' sidebar-link--active' : '')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-theme-toggle" onClick={toggle} title="Tema almashtirish">
          {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
        </button>
        <span className="sidebar-email">{user?.email}</span>
        <button className="sidebar-logout" onClick={handleLogout}>
          Chiqish
        </button>
      </div>
    </aside>
  );
}
