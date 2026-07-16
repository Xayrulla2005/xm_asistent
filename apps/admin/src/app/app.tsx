import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import Layout from '../components/Layout';
import Audit from '../pages/Audit';
import Billing from '../pages/Billing';
import Bugs from '../pages/Bugs';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import Statistics from '../pages/Statistics';
import Tenants from '../pages/Tenants';
import Users from '../pages/Users';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/tenants"     element={<Tenants />} />
        <Route path="/statistics"  element={<Statistics />} />
        <Route path="/users"       element={<Users />} />
        <Route path="/billing"     element={<Billing />} />
        <Route path="/bugs"        element={<Bugs />} />
        <Route path="/audit"       element={<Audit />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
