import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useConfigStore } from '../stores/config.store';

import Sales from '../pages/Sales';
import Warehouse from '../pages/Warehouse';
import Customers from '../pages/Customers';
import Payments from '../pages/Payments';

import Patients from '../templates/clinic/Patients';
import Appointments from '../templates/clinic/Appointments';
import Doctors from '../templates/clinic/Doctors';
import Pharmacy from '../templates/clinic/Pharmacy';

import Students from '../templates/education/Students';
import Courses from '../templates/education/Courses';
import Teachers from '../templates/education/Teachers';
import Attendance from '../templates/education/Attendance';

import Menu from '../templates/restaurant/Menu';
import Orders from '../templates/restaurant/Orders';
import Kitchen from '../templates/restaurant/Kitchen';
import Tables from '../templates/restaurant/Tables';

import PlaceholderPage from '../templates/PlaceholderPage';

type ModuleMap = Record<string, React.ComponentType>;

const RETAIL_MODULES: ModuleMap = {
  sales: Sales, warehouse: Warehouse, customers: Customers, payments: Payments,
};

const CLINIC_MODULES: ModuleMap = {
  patients: Patients, appointments: Appointments, doctors: Doctors,
  pharmacy: Pharmacy, payments: Payments,
};

const EDUCATION_MODULES: ModuleMap = {
  students: Students, courses: Courses, teachers: Teachers,
  attendance: Attendance, payments: Payments,
};

const RESTAURANT_MODULES: ModuleMap = {
  menu: Menu, orders: Orders, kitchen: Kitchen, tables: Tables,
  payments: Payments, warehouse: Warehouse,
};

const ALL_MODULES: Record<string, ModuleMap> = {
  retail:     RETAIL_MODULES,
  clinic:     CLINIC_MODULES,
  education:  EDUCATION_MODULES,
  restaurant: RESTAURANT_MODULES,
};

export default function ModuleRenderer() {
  const { module } = useParams<{ module: string }>();
  const config     = useConfigStore((s) => s.config);
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
          <span style={{ fontSize: '3.5rem' }}>🔒</span>
          <h2 style={{ margin: 0, color: 'var(--text)' }}>Ruxsat yo'q</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: 320 }}>
            <strong>{module}</strong> moduliga kirish uchun ruxsatingiz mavjud emas.
            Administrator bilan bog'laning.
          </p>
        </div>
      </div>
    );
  }

  const industryKey = config?.industry ?? 'retail';
  const moduleMap   = ALL_MODULES[industryKey] ?? RETAIL_MODULES;
  const Component   = module ? moduleMap[module] : undefined;

  if (!Component) {
    return (
      <PlaceholderPage
        name={module ?? 'Modul'}
        description={`"${module}" moduli hali ishlab chiqilmoqda`}
      />
    );
  }

  return <Component />;
}
