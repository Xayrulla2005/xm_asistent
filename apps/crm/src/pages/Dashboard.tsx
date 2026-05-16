import { useEffect, useState } from 'react';
import { getStats, SaleStats } from '../api/sales.api';
import { getProducts } from '../api/products.api';
import { getCustomers } from '../api/customers.api';
import { useTenantStore } from '../stores/tenant.store';
import { useAuthStore } from '../stores/auth.store';
import { useConfigStore } from '../stores/config.store';

const fmt = (n: number) => n.toLocaleString('uz-UZ') + " so'm";

interface StatCard {
  emoji: string;
  label: string;
  value: string;
  color: string;
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const tenantId = useTenantStore((s) => s.tenantId);
  const hasModule = useConfigStore((s) => s.hasModule);
  const config = useConfigStore((s) => s.config);

  const [stats, setStats] = useState<SaleStats | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calls: Promise<unknown>[] = [];

    if (hasModule('sales')) {
      calls.push(getStats(tenantId).then(setStats));
    }
    if (hasModule('warehouse')) {
      calls.push(getProducts(tenantId).then((p) => setProductCount(p.length)));
    }
    if (hasModule('customers')) {
      calls.push(getCustomers(tenantId).then((c) => setCustomerCount(c.length)));
    }

    Promise.all(calls).finally(() => setLoading(false));
  }, [tenantId, config]);

  const cards: StatCard[] = [
    hasModule('sales') && {
      emoji: '💰',
      label: 'Bugungi sotuv',
      value: stats ? fmt(stats.totalAmount) : '—',
      color: '#10b981',
    },
    hasModule('sales') && {
      emoji: '🛒',
      label: 'Bugungi sotuvlar',
      value: stats ? `${stats.totalSales} ta` : '—',
      color: '#3b82f6',
    },
    hasModule('customers') && {
      emoji: '👥',
      label: 'Jami mijozlar',
      value: `${customerCount} ta`,
      color: '#8b5cf6',
    },
    hasModule('warehouse') && {
      emoji: '📦',
      label: 'Mahsulotlar',
      value: `${productCount} ta`,
      color: '#f59e0b',
    },
  ].filter(Boolean) as StatCard[];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Xush kelibsiz, {user?.email}</p>
        </div>
        <span className="date-badge">
          {new Date().toLocaleDateString('uz-UZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>

      <div className="stat-grid">
        {cards.map((s) => (
          <div key={s.label} className="stat-card">
            <div
              className="stat-icon"
              style={{ background: s.color + '20', color: s.color }}
            >
              {s.emoji}
            </div>
            <div className="stat-info">
              <p className="stat-label">{s.label}</p>
              <p className="stat-value">{loading ? '...' : s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {!loading && hasModule('sales') && stats?.totalSales === 0 && (
        <div className="empty-hint">
          <p>
            Bugun hali sotuv yo'q.{' '}
            <a href="/sales">Yangi sotuv qo'shish →</a>
          </p>
        </div>
      )}
    </div>
  );
}
