import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import DynamicLayout from '../components/DynamicLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Employees from '../pages/Employees';
import Pos from '../pages/Pos';
import Products from '../pages/Products';
import ModuleRenderer from '../components/ModuleRenderer';
import BugReportButton from '../components/BugReportButton';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
    <BugReportButton />
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <DynamicLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard"  element={<Dashboard />} />
        <Route path="/pos"        element={<Pos />} />
        <Route path="/products"   element={<Products />} />
        <Route path="/employees"  element={<Employees />} />
        <Route path="/:module"    element={<ModuleRenderer />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
