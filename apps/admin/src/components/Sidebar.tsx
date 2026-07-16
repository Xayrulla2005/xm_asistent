import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';

const navItems = [
  { to: '/dashboard',  label: 'Dashboard'           },
  { to: '/tenants',    label: 'Tenants'              },
  { to: '/statistics', label: 'Statistika'           },
  { to: '/users',      label: 'Foydalanuvchilar'     },
  { to: '/billing',    label: 'Billing'              },
  { to: '/bugs',       label: 'Bug Tracker'          },
  { to: '/audit',      label: 'Audit Jurnali'        },
];

interface Props {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNav = () => {
    onClose?.();
  };

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar-logo">
        XM Admin
        <button className="sidebar-close" onClick={onClose} aria-label="Yopish">✕</button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleNav}
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
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <span className="sidebar-email">{user?.email}</span>
        <button className="sidebar-logout" onClick={handleLogout}>
          Chiqish
        </button>
      </div>
    </aside>
  );
}
