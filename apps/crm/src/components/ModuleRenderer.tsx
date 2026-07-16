import { useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useConfigStore } from '../stores/config.store';

import Pos from '../pages/Pos';
import Products from '../pages/Products';
import Sales from '../pages/Sales';
import Warehouse from '../pages/Warehouse';
import Customers from '../pages/Customers';
import Payments from '../pages/Payments';
import Employees from '../pages/Employees';
import Reports from '../pages/Reports';
import Branches from '../pages/Branches';
import Portal from '../pages/Portal';
import Settings from '../pages/Settings';

import Patients from '../templates/clinic/Patients';
import Appointments from '../templates/clinic/Appointments';
import Doctors from '../templates/clinic/Doctors';
import Pharmacy from '../templates/clinic/Pharmacy';
import Prescriptions from '../templates/clinic/Prescriptions';

import Students from '../templates/education/Students';
import Courses from '../templates/education/Courses';
import Teachers from '../templates/education/Teachers';
import Attendance from '../templates/education/Attendance';
import EduPayments from '../templates/education/Payments';

import Menu from '../templates/restaurant/Menu';
import Orders from '../templates/restaurant/Orders';
import Kitchen from '../templates/restaurant/Kitchen';
import Tables from '../templates/restaurant/Tables';

import GymMembers from '../templates/gym/Members';
import GymPlans from '../templates/gym/Plans';
import GymCheckIn from '../templates/gym/CheckIn';

import BeautyAppointments from '../templates/beauty/Appointments';
import BeautyMasters from '../templates/beauty/Masters';
import BeautyServices from '../templates/beauty/Services';

import AutoServiceOrders from '../templates/auto/ServiceOrders';
import AutoVehicles from '../templates/auto/Vehicles';

import PlaceholderPage from '../templates/PlaceholderPage';

type ModuleMap = Record<string, React.ComponentType>;

// Single flat map — works for all industries.
// The CRM engine already controls which modules a tenant has access to;
// ModuleRenderer just needs to know which component to render for each key.
const MODULE_MAP: ModuleMap = {
  // retail / common
  pos:       Pos,
  products:  Products,
  sales:     Sales,
  warehouse: Warehouse,
  customers: Customers,
  payments:  Payments,
  employees: Employees,
  reports:   Reports,
  branches:  Branches,
  portal:    Portal,
  settings:  Settings,
  // clinic
  patients:      Patients,
  appointments:  Appointments,
  doctors:       Doctors,
  pharmacy:      Pharmacy,
  prescriptions: Prescriptions,
  // education
  students:    Students,
  courses:     Courses,
  teachers:    Teachers,
  attendance:  Attendance,
  edu_payments: EduPayments,
  // restaurant
  menu:    Menu,
  orders:  Orders,
  kitchen: Kitchen,
  tables:  Tables,
  // gym / fitness
  gym_members: GymMembers,
  gym_plans:   GymPlans,
  gym_checkin: GymCheckIn,
  // beauty / salon
  beauty_appointments:     BeautyAppointments,
  beauty_masters:          BeautyMasters,
  beauty_services_catalog: BeautyServices,
  // auto servis
  auto_orders:   AutoServiceOrders,
  auto_vehicles: AutoVehicles,
};

export default function ModuleRenderer() {
  const { module } = useParams<{ module: string }>();
  const canAccess  = useConfigStore((s) => s.canAccess);
  const userRole   = useAuthStore((s) => s.user?.role ?? '');

  // Permission guard — admins bypass all module restrictions
  const isAdmin = userRole === 'admin' || userRole === 'ADMIN';
  if (module && !isAdmin && !canAccess(module)) {
    return (
      <div className="page">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '60vh', gap: '1rem', textAlign: 'center',
        }}>
          <Lock size={40} style={{ color: 'var(--text-muted)' }} />
          <h2 style={{ margin: 0, color: 'var(--text)' }}>Ruxsat yo'q</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: 320 }}>
            <strong>{module}</strong> moduliga kirish uchun ruxsatingiz mavjud emas.
            Administrator bilan bog'laning.
          </p>
        </div>
      </div>
    );
  }

  const Component = module ? MODULE_MAP[module] : undefined;

  if (!Component) {
    return (
      <PlaceholderPage
        name={module ?? 'Modul'}
        description={`"${module}" moduli tez orada qo'shiladi`}
      />
    );
  }

  return <Component />;
}
