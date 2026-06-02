import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { Product } from '../products/entities/product.entity';

function dayRange(date: Date): [Date, Date] {
  const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
  const end   = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999));
  return [start, end];
}

function pct(today: number, yesterday: number): number {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Sale)    private readonly saleRepo:    Repository<Sale>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  async getStats(tenantId: string, dateStr?: string) {
    try {
    const target    = dateStr ? new Date(dateStr) : new Date();
    const yesterday = new Date(target.getTime() - 86400000);

    const [startToday,     endToday]     = dayRange(target);
    const [startYesterday, endYesterday] = dayRange(yesterday);
    const weekStart = new Date(startToday.getTime() - 6 * 86400000);

    // ── Load sales ────────────────────────────────────────────────────────────
    const [todaySales, yesterdaySales, weekSales, recentRaw] = await Promise.all([
      this.saleRepo.find({
        where: { tenantId, status: SaleStatus.COMPLETED, createdAt: Between(startToday, endToday) },
      }),
      this.saleRepo.find({
        where: { tenantId, status: SaleStatus.COMPLETED, createdAt: Between(startYesterday, endYesterday) },
      }),
      this.saleRepo.find({
        where: { tenantId, status: SaleStatus.COMPLETED, createdAt: Between(weekStart, endToday) },
        order: { createdAt: 'ASC' },
      }),
      this.saleRepo.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
    ]);

    // ── Load products needed for profit calculation ───────────────────────────
    const productIds = [
      ...new Set(todaySales.flatMap(s => (s.items ?? []).map(i => i.productId))),
    ];
    const products = productIds.length > 0
      ? await this.productRepo.findBy({ id: In(productIds) })
      : [];
    const productMap = new Map(products.map(p => [p.id, p]));

    // ── Revenue & profit helpers ──────────────────────────────────────────────
    const sumRevenue = (sales: Sale[]) =>
      sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);

    const sumProfit = (sales: Sale[]) =>
      sales.reduce((s, sale) =>
        s + (sale.items ?? []).reduce((is, item) => {
          const cost = Number(productMap.get(item.productId)?.costPrice ?? 0);
          return is + (Number(item.price) - cost) * item.quantity;
        }, 0), 0);

    const byType = (sales: Sale[], type: string) =>
      sales.filter(s => s.paymentType === type).reduce((s, sale) => s + Number(sale.totalAmount), 0);

    // ── a) Cards ──────────────────────────────────────────────────────────────
    const todayRevenue     = sumRevenue(todaySales);
    const yesterdayRevenue = sumRevenue(yesterdaySales);
    const grossProfit      = sumProfit(todaySales);
    const grossProfitYest  = sumProfit(yesterdaySales);
    const cashTotal   = byType(todaySales, 'cash');
    const cardTotal   = byType(todaySales, 'card');
    const debtTotal   = byType(todaySales, 'credit');

    const cards = {
      todayRevenue,
      todayRevenueChange: pct(todayRevenue, yesterdayRevenue),
      grossProfit,
      grossProfitChange:  pct(grossProfit, grossProfitYest),
      cashTotal,
      cashChange:  pct(cashTotal, byType(yesterdaySales, 'cash')),
      cardTotal,
      cardChange:  pct(cardTotal, byType(yesterdaySales, 'card')),
      debtTotal,
      debtChange:  pct(debtTotal, byType(yesterdaySales, 'credit')),
      todaySalesCount:     todaySales.length,
      yesterdaySalesCount: yesterdaySales.length,
    };

    // ── b) Weekly chart ───────────────────────────────────────────────────────
    const weeklyMap = new Map<string, { revenue: number; salesCount: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * 86400000);
      weeklyMap.set(d.toISOString().slice(0, 10), { revenue: 0, salesCount: 0 });
    }
    for (const sale of weekSales) {
      const key   = new Date(sale.createdAt).toISOString().slice(0, 10);
      const entry = weeklyMap.get(key);
      if (entry) { entry.revenue += Number(sale.totalAmount); entry.salesCount += 1; }
    }
    const weeklyChart = Array.from(weeklyMap.entries()).map(([date, v]) => ({ date, ...v }));

    // ── c) Payment breakdown ──────────────────────────────────────────────────
    const totalForPct = todayRevenue || 1;
    const paymentBreakdown = {
      cash:   { amount: cashTotal,  percent: Math.round(cashTotal  / totalForPct * 100) },
      card:   { amount: cardTotal,  percent: Math.round(cardTotal  / totalForPct * 100) },
      credit: { amount: debtTotal,  percent: Math.round(debtTotal  / totalForPct * 100) },
    };

    // ── d) Recent sales ───────────────────────────────────────────────────────
    const recentSales = recentRaw.map(s => ({
      id:           s.id,
      createdAt:    s.createdAt,
      customerName: s.customerName,
      paymentType:  s.paymentType,
      totalAmount:  Number(s.totalAmount),
      itemsCount:   (s.items ?? []).length,
    }));

    // ── e) Best selling ───────────────────────────────────────────────────────
    const itemAgg = new Map<string, {
      productId: string; productName: string; unit: string;
      totalQty: number; totalRevenue: number; totalProfit: number;
    }>();
    for (const sale of todaySales) {
      for (const item of (sale.items ?? [])) {
        const prod = productMap.get(item.productId);
        const cost = Number(prod?.costPrice ?? 0);
        const rev  = Number(item.price) * item.quantity;
        const prof = (Number(item.price) - cost) * item.quantity;
        const cur  = itemAgg.get(item.productId);
        if (cur) {
          cur.totalQty     += item.quantity;
          cur.totalRevenue += rev;
          cur.totalProfit  += prof;
        } else {
          itemAgg.set(item.productId, {
            productId:   item.productId,
            productName: item.name,
            unit:        prod?.unit ?? 'dona',
            totalQty:    item.quantity,
            totalRevenue: rev,
            totalProfit:  prof,
          });
        }
      }
    }
    const bestSelling = Array.from(itemAgg.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);

    // ── f) Low stock ──────────────────────────────────────────────────────────
    const lowStockRows = await this.productRepo
      .createQueryBuilder('p')
      .where('p."tenantId" = :tenantId', { tenantId })
      .andWhere('p."isActive" = true')
      .andWhere('p.quantity <= p."minStock"')
      .orderBy('p.quantity', 'ASC')
      .getMany();

    const lowStock = lowStockRows.map(p => ({
      id:       p.id,
      name:     p.name,
      quantity: p.quantity,
      minStock: p.minStock,
      unit:     p.unit,
      status:   p.quantity === 0 ? 'critical' : 'low',
    }));

    return { cards, weeklyChart, paymentBreakdown, recentSales, bestSelling, lowStock };
    } catch {
      return {
        cards: {
          todayRevenue: 0, todayRevenueChange: 0,
          grossProfit: 0, grossProfitChange: 0,
          cashTotal: 0, cashChange: 0,
          cardTotal: 0, cardChange: 0,
          debtTotal: 0, debtChange: 0,
          todaySalesCount: 0, yesterdaySalesCount: 0,
        },
        weeklyChart: [],
        paymentBreakdown: {
          cash:   { amount: 0, percent: 0 },
          card:   { amount: 0, percent: 0 },
          credit: { amount: 0, percent: 0 },
        },
        recentSales: [],
        bestSelling: [],
        lowStock: [],
      };
    }
  }
}
