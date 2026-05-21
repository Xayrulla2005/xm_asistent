import api from './axios';

export interface DashboardCards {
  todayRevenue: number;
  todayRevenueChange: number;
  grossProfit: number;
  grossProfitChange: number;
  cashTotal: number;
  cashChange: number;
  cardTotal: number;
  cardChange: number;
  debtTotal: number;
  debtChange: number;
  todaySalesCount: number;
  yesterdaySalesCount: number;
}

export interface WeekDay {
  date: string;
  revenue: number;
  salesCount: number;
}

export interface PaymentBreakdown {
  cash:   { amount: number; percent: number };
  card:   { amount: number; percent: number };
  credit: { amount: number; percent: number };
}

export interface RecentSale {
  id: string;
  createdAt: string;
  customerName: string;
  paymentType: string;
  totalAmount: number;
  itemsCount: number;
}

export interface BestSelling {
  productId: string;
  productName: string;
  unit: string;
  totalQty: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  minStock: number;
  unit: string;
  status: 'critical' | 'low';
}

export interface DashboardStats {
  cards: DashboardCards;
  weeklyChart: WeekDay[];
  paymentBreakdown: PaymentBreakdown;
  recentSales: RecentSale[];
  bestSelling: BestSelling[];
  lowStock: LowStockItem[];
}

export const getDashboardStats = (tenantId: string, date: string) =>
  api
    .get<DashboardStats>('/dashboard/stats', { params: { tenantId, date } })
    .then((r) => r.data);
