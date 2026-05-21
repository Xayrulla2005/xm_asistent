import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import DynamicSidebar from './DynamicSidebar';
import { useConfigStore } from '../stores/config.store';
import { useTenantStore } from '../stores/tenant.store';

export default function DynamicLayout() {
  const tenantId    = useTenantStore((s) => s.tenantId);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const config      = useConfigStore((s) => s.config);

  useEffect(() => {
    fetchConfig(tenantId);
  }, [tenantId]);

  useEffect(() => {
    const style = config?.theme?.style || 'modern';
    document.body.setAttribute('data-style', style);
  }, [config?.theme?.style]);

  return (
    <div className="layout">
      <DynamicSidebar />
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
