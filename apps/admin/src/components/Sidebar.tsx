import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Users,
  CreditCard,
  Bug,
  ClipboardList,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';

const navItems = [
  { to: '/dashboard',  label: 'Bosh sahifa',       icon: LayoutDashboard },
  { to: '/tenants',    label: 'Kompaniyalar',       icon: Building2       },
  { to: '/statistics', label: 'Statistika',          icon: BarChart3       },
  { to: '/users',      label: 'Foydalanuvchilar',   icon: Users           },
  { to: '/billing',    label: 'To\'lovlar',          icon: CreditCard      },
  { to: '/bugs',       label: 'Xatolar',             icon: Bug             },
  { to: '/audit',      label: 'Audit jurnali',      icon: ClipboardList   },
  { to: '/landing-cms', label: 'Landing page CMS',  icon: Globe           },
];

function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

interface Props {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const navigate  = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNav = () => onClose?.();

  const initials = user?.email ? getInitials(user.email) : 'A';

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-brand">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <ShieldCheck size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="sidebar-logo-text">XM Admin</div>
            <div className="sidebar-logo-sub">Superadmin panel</div>
          </div>
        </div>
        <button className="sidebar-close" onClick={onClose} aria-label="Yopish">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Asosiy menyu">
        <span className="sidebar-nav-section">Asosiy</span>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNav}
            className={({ isActive }) =>
              'sidebar-link' + (isActive ? ' sidebar-link--active' : '')
            }
            title={label}
          >
            <Icon size={16} className="sidebar-link-icon" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* User info */}
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.email}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
          </div>
        )}

        {/* Theme toggle */}
        <button
          className="sidebar-footer-btn"
          onClick={toggle}
          title="Temani almashtirish"
          aria-label={theme === 'dark' ? 'Kunduzgi temaga o\'tish' : 'Tungi temaga o\'tish'}
        >
          {theme === 'dark' ? (
            <Sun size={15} aria-hidden="true" />
          ) : (
            <Moon size={15} aria-hidden="true" />
          )}
          {theme === 'dark' ? 'Kunduzgi tema' : 'Tungi tema'}
        </button>

        {/* Logout */}
        <button
          className="sidebar-footer-btn sidebar-footer-btn--danger"
          onClick={handleLogout}
          title="Chiqish"
        >
          <LogOut size={15} aria-hidden="true" />
          Chiqish
        </button>
      </div>
    </aside>
  );
}
