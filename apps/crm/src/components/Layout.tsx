import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useConfigStore } from '../stores/config.store';
import { useTenantStore } from '../stores/tenant.store';

export default function Layout() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);

  useEffect(() => {
    fetchConfig(tenantId);
  }, [tenantId]);

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
