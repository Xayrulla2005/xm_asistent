import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import DynamicLayout from '../components/DynamicLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import ModuleRenderer from '../components/ModuleRenderer';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <DynamicLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/:module"   element={<ModuleRenderer />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
