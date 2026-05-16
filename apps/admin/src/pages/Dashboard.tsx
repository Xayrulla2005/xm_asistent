import { useAuthStore } from '../stores/auth.store';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
      </div>

      <div className="card">
        <h3>Xush kelibsiz, Admin!</h3>
        <p style={{ color: '#666', margin: '0.5rem 0 1.5rem' }}>
          Bu XM asistent boshqaruv paneli.
        </p>
        {user && (
          <div className="info-block">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Rol:</strong> {user.role}</p>
          </div>
        )}
      </div>
    </div>
  );
}
