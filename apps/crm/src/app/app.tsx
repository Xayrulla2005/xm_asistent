import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import DynamicLayout from '../components/DynamicLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Employees from '../pages/Employees';
import ModuleRenderer from '../components/ModuleRenderer';
import SubscriptionPage from '../pages/Subscription';
import BugReportButton from '../components/BugReportButton';
import Wizard from '../pages/Wizard';
import Register from '../pages/Register';
import NewWorkspace from '../pages/NewWorkspace';
import ReceiptPage from '../pages/Receipt';
import ToastContainer from '../components/ToastContainer';
import ClientPortalLanding from '../pages/client/ClientPortalLanding';
import ClientPortalLogin from '../pages/client/ClientPortalLogin';
import ClientPortalDashboard from '../pages/client/ClientPortalDashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
    <ToastContainer />
    <BugReportButton />
    <Routes>
      <Route path="/" element={<Login />} />
      {/* Public routes — no auth required */}
      <Route path="/register"               element={<Register />} />
      <Route path="/wizard/:tenantId"       element={<Wizard />} />
      {/* Client portal — separate auth (customer JWT), no staff auth needed */}
      <Route path="/client/:slug"           element={<ClientPortalLanding />} />
      <Route path="/client/:slug/login"     element={<ClientPortalLogin />} />
      <Route path="/client/:slug/portal"    element={<ClientPortalDashboard />} />
      {/* Protected: creates a new tenant for logged-in users with no CRM */}
      <Route path="/new-workspace"      element={<ProtectedRoute><NewWorkspace /></ProtectedRoute>} />
      <Route path="/receipt/:saleId"    element={<ReceiptPage />} />
      <Route
        element={
          <ProtectedRoute>
            <DynamicLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard and employees are always available; everything else is
            permission-checked and component-resolved through ModuleRenderer. */}
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/employees"    element={<Employees />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/:module"      element={<ModuleRenderer />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
