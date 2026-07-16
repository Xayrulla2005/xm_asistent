import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThanOrEqual } from 'typeorm';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { Product } from '../products/entities/product.entity';
import { RestOrder } from '../restaurant/entities/order.entity';
import { Appointment } from '../clinic/entities/appointment.entity';
import { Student } from '../education/entities/student.entity';
import { EduPayment } from '../education/entities/edu-payment.entity';
import { GymMember } from '../gym/entities/gym-member.entity';
import { GymCheckIn } from '../gym/entities/gym-checkin.entity';
import { BeautyAppointment } from '../beauty/entities/beauty-appointment.entity';
import { AutoServiceOrder, WorkItem } from '../auto/entities/auto-service-order.entity';

function dayRange(date: Date): [Date, Date] {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end   = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  return [start, end];
}

function pct(today: number, yesterday: number): number {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10;
}

function todayUtcStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekStartUtcStr(): string {
  const now = new Date();
  const [start] = dayRange(now);
  const d = new Date(start.getTime() - 6 * 86400000);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Sale)       private readonly saleRepo:        Repository<Sale>,
    @InjectRepository(Product)    private readonly productRepo:      Repository<Product>,
    @InjectRepository(RestOrder)  private readonly restOrderRepo:    Repository<RestOrder>,
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Student)    private readonly studentRepo:      Repository<Student>,
    @InjectRepository(EduPayment) private readonly eduPaymentRepo:   Repository<EduPayment>,
    @InjectRepository(GymMember)          private readonly gymMemberRepo:        Repository<GymMember>,
    @InjectRepository(GymCheckIn)         private readonly gymCheckInRepo:       Repository<GymCheckIn>,
    @InjectRepository(BeautyAppointment)  private readonly beautyApptRepo:       Repository<BeautyAppointment>,
    @InjectRepository(AutoServiceOrder)   private readonly autoOrderRepo:        Repository<AutoServiceOrder>,
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

  // ── Restaurant stats ────────────────────────────────────────────────────────

  async getRestaurantStats(tenantId: string) {
    const now = new Date();
    const [startToday, endToday] = dayRange(now);
    const weekStart = new Date(startToday.getTime() - 6 * 86400000);

    const [todayPaid, weekPaid, recentRaw, pendingCount, cookingCount] = await Promise.all([
      this.restOrderRepo.find({
        where: { tenantId, status: 'paid', createdAt: Between(startToday, endToday) },
      }),
      this.restOrderRepo.find({
        where: { tenantId, status: 'paid', createdAt: Between(weekStart, endToday) },
        order: { createdAt: 'ASC' },
      }),
      this.restOrderRepo.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.restOrderRepo.count({ where: { tenantId, status: 'pending' } }),
      this.restOrderRepo.count({ where: { tenantId, status: 'cooking' } }),
    ]);

    const todayRevenue = todayPaid.reduce((s, o) => s + Number(o.total), 0);

    // weekly chart
    const weeklyMap = new Map<string, { revenue: number; count: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * 86400000);
      weeklyMap.set(d.toISOString().slice(0, 10), { revenue: 0, count: 0 });
    }
    for (const o of weekPaid) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      const entry = weeklyMap.get(key);
      if (entry) { entry.revenue += Number(o.total); entry.count += 1; }
    }
    const weeklyChart = Array.from(weeklyMap.entries()).map(([date, v]) => ({ date, ...v }));

    // top dishes aggregated from JSONB items
    const dishMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of todayPaid) {
      for (const item of (o.items ?? [])) {
        const key = item.menuItemId || item.name;
        const cur = dishMap.get(key);
        if (cur) {
          cur.qty     += item.qty;
          cur.revenue += Number(item.price) * item.qty;
        } else {
          dishMap.set(key, {
            name:    item.name,
            qty:     item.qty,
            revenue: Number(item.price) * item.qty,
          });
        }
      }
    }
    const topDishes = Array.from(dishMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const recentOrders = recentRaw.map(o => ({
      id:           o.id,
      tableNumber:  o.tableNumber,
      customerName: o.customerName,
      status:       o.status,
      total:        Number(o.total),
      createdAt:    o.createdAt,
    }));

    return {
      todayRevenue,
      todayCount:   todayPaid.length,
      pendingCount,
      cookingCount,
      weeklyChart,
      topDishes,
      recentOrders,
    };
  }

  // ── Clinic stats ────────────────────────────────────────────────────────────

  async getClinicStats(tenantId: string) {
    const todayStr    = todayUtcStr();
    const wkStartStr  = weekStartUtcStr();

    const [todayList, weekList, recentRaw] = await Promise.all([
      this.appointmentRepo.find({ where: { tenantId, date: todayStr } }),
      this.appointmentRepo.createQueryBuilder('a')
        .where('a."tenantId" = :tenantId', { tenantId })
        .andWhere('a.date BETWEEN :wk AND :td', { wk: wkStartStr, td: todayStr })
        .orderBy('a.date', 'ASC')
        .getMany(),
      this.appointmentRepo.find({
        where:  { tenantId },
        order:  { createdAt: 'DESC' },
        take:   10,
      }),
    ]);

    const scheduled       = todayList.filter(a => a.status === 'scheduled').length;
    const completedToday  = todayList.filter(a => a.status === 'completed');
    const todayFee        = completedToday.reduce((s, a) => s + Number(a.fee), 0);

    // weekly chart — group by date string
    const weeklyMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const base = new Date(wkStartStr + 'T00:00:00Z');
      const d    = new Date(base.getTime() + i * 86400000);
      weeklyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const a of weekList) {
      weeklyMap.set(a.date, (weeklyMap.get(a.date) ?? 0) + 1);
    }
    const weeklyChart = Array.from(weeklyMap.entries()).map(([date, count]) => ({ date, count }));

    const recent = recentRaw.map(a => ({
      id:          a.id,
      patientName: a.patientName,
      doctorName:  a.doctorName,
      date:        a.date,
      time:        a.time,
      status:      a.status,
      fee:         Number(a.fee),
    }));

    return {
      todayCount:          todayList.length,
      scheduled,
      completedTodayCount: completedToday.length,
      todayFee,
      weeklyChart,
      recent,
    };
  }

  // ── Education stats ─────────────────────────────────────────────────────────

  async getEducationStats(tenantId: string) {
    const now         = new Date();
    const [startToday, endToday] = dayRange(now);
    const weekStart   = new Date(startToday.getTime() - 6 * 86400000);
    const thisMonth   = now.toISOString().slice(0, 7); // YYYY-MM

    const [totalActive, monthPayments, weekStudents, recentPayments] = await Promise.all([
      this.studentRepo.count({ where: { tenantId, status: 'active' } }),
      this.eduPaymentRepo.find({ where: { tenantId, month: thisMonth } }),
      this.studentRepo.find({
        where: { tenantId, createdAt: Between(weekStart, endToday) },
        order: { createdAt: 'ASC' },
      }),
      this.eduPaymentRepo.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take:  10,
      }),
    ]);

    const totalExpected = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
    const totalPaid     = monthPayments.reduce((s, p) => s + Number(p.paidAmount), 0);
    const paidCount     = monthPayments.filter(p => p.status === 'paid').length;
    const pendingCount  = monthPayments.filter(p => p.status === 'pending').length;
    const partialCount  = monthPayments.filter(p => p.status === 'partial').length;
    const overdueCount  = monthPayments.filter(p => p.status === 'overdue').length;

    // weekly new students
    const weeklyMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * 86400000);
      weeklyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const s of weekStudents) {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + 1);
    }
    const weeklyChart = Array.from(weeklyMap.entries()).map(([date, count]) => ({ date, count }));

    const recentPaymentsOut = recentPayments.map(p => ({
      id:          p.id,
      studentName: p.studentName,
      courseName:  p.courseName,
      month:       p.month,
      amount:      Number(p.amount),
      paidAmount:  Number(p.paidAmount),
      status:      p.status,
      createdAt:   p.createdAt,
    }));

    return {
      totalActive,
      thisMonth,
      totalExpected,
      totalPaid,
      paidCount,
      pendingCount,
      partialCount,
      overdueCount,
      weeklyChart,
      recentPayments: recentPaymentsOut,
    };
  }

  // ── Gym stats ───────────────────────────────────────────────────────────────

  async getGymStats(tenantId: string) {
    const now         = new Date();
    const [startToday] = dayRange(now);
    const todayStr    = todayUtcStr();
    const weekStart   = new Date(startToday.getTime() - 6 * 86400000);
    const in7Days     = new Date(startToday.getTime() + 7 * 86400000);
    const in7DaysStr  = in7Days.toISOString().slice(0, 10);

    const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [
      totalActive,
      totalExpired,
      expiringIn7Days,
      todayCheckins,
      newThisMonth,
      weekCheckins,
      recentCheckins,
    ] = await Promise.all([
      this.gymMemberRepo.count({ where: { tenantId, status: 'active' } }),
      this.gymMemberRepo.count({ where: { tenantId, status: 'expired' } }),
      this.gymMemberRepo.createQueryBuilder('m')
        .where('m."tenantId" = :tenantId', { tenantId })
        .andWhere('m.status = :status', { status: 'active' })
        .andWhere('m."expiresAt" BETWEEN :today AND :in7Days', { today: todayStr, in7Days: in7DaysStr })
        .getCount(),
      this.gymCheckInRepo.count({
        where: { tenantId, checkedAt: MoreThanOrEqual(startToday) },
      }),
      this.gymMemberRepo.count({
        where: { tenantId, createdAt: MoreThanOrEqual(firstOfMonth) },
      }),
      this.gymCheckInRepo.find({
        where: { tenantId, checkedAt: MoreThanOrEqual(weekStart) },
        order: { checkedAt: 'ASC' },
      }),
      this.gymCheckInRepo.find({
        where: { tenantId },
        order: { checkedAt: 'DESC' },
        take:  10,
      }),
    ]);

    // weekly checkins by day
    const weeklyMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * 86400000);
      weeklyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const c of weekCheckins) {
      const key = new Date(c.checkedAt).toISOString().slice(0, 10);
      weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + 1);
    }
    const weeklyChart = Array.from(weeklyMap.entries()).map(([date, count]) => ({ date, count }));

    const recentCheckinsOut = recentCheckins.map(c => ({
      id:         c.id,
      memberId:   c.memberId,
      memberName: c.memberName,
      checkedAt:  c.checkedAt,
    }));

    return {
      totalActive,
      totalExpired,
      expiringIn7Days,
      todayCheckins,
      newThisMonth,
      weeklyChart,
      recentCheckins: recentCheckinsOut,
    };
  }

  // ── Beauty / Salon stats ────────────────────────────────────────────────────

  async getBeautyStats(tenantId: string) {
    const todayStr   = todayUtcStr();
    const wkStartStr = weekStartUtcStr();

    const [todayList, weekList, recentRaw] = await Promise.all([
      this.beautyApptRepo.find({ where: { tenantId, date: todayStr } }),
      this.beautyApptRepo.createQueryBuilder('a')
        .where('a."tenantId" = :tenantId', { tenantId })
        .andWhere('a.date BETWEEN :wk AND :td', { wk: wkStartStr, td: todayStr })
        .orderBy('a.date', 'ASC')
        .getMany(),
      this.beautyApptRepo.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take:  10,
      }),
    ]);

    const scheduled      = todayList.filter(a => a.status === 'scheduled').length;
    const inProgress     = todayList.filter(a => a.status === 'in_progress').length;
    const completedToday = todayList.filter(a => a.status === 'completed');
    const todayFee       = completedToday.reduce((s, a) => s + Number(a.fee), 0);

    // weekly chart
    const weeklyMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const base = new Date(wkStartStr + 'T00:00:00Z');
      const d    = new Date(base.getTime() + i * 86400000);
      weeklyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const a of weekList) weeklyMap.set(a.date, (weeklyMap.get(a.date) ?? 0) + 1);
    const weeklyChart = Array.from(weeklyMap.entries()).map(([date, count]) => ({ date, count }));

    // top masters this week
    const masterMap = new Map<string, { name: string; count: number; revenue: number }>();
    for (const a of weekList) {
      if (!a.masterName) continue;
      const key = a.masterName;
      const ex  = masterMap.get(key) ?? { name: key, count: 0, revenue: 0 };
      ex.count  += 1;
      ex.revenue += Number(a.fee);
      masterMap.set(key, ex);
    }
    const topMasters = [...masterMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    // top services this week
    const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
    for (const a of weekList) {
      if (!a.serviceName) continue;
      const key = a.serviceName;
      const ex  = serviceMap.get(key) ?? { name: key, count: 0, revenue: 0 };
      ex.count  += 1;
      ex.revenue += Number(a.fee);
      serviceMap.set(key, ex);
    }
    const topServices = [...serviceMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const recent = recentRaw.map(a => ({
      id:         a.id,
      clientName: a.clientName,
      masterName: a.masterName,
      serviceName: a.serviceName,
      date:       a.date,
      timeSlot:   a.timeSlot,
      status:     a.status,
      fee:        Number(a.fee),
    }));

    return {
      todayCount:      todayList.length,
      scheduled,
      inProgress,
      completedToday:  completedToday.length,
      todayFee,
      weeklyChart,
      topMasters,
      topServices,
      recent,
    };
  }

  // ── Auto servis stats ───────────────────────────────────────────────────────

  async getAutoStats(tenantId: string) {
    const now = new Date();
    const [startToday, endToday] = dayRange(now);
    const weekStart = new Date(startToday.getTime() - 6 * 86400000);

    const [
      receivedCount,
      diagnosingCount,
      inProgressCount,
      readyCount,
      totalToday,
      weekOrders,
      recentRaw,
    ] = await Promise.all([
      this.autoOrderRepo.count({ where: { tenantId, status: 'received'    } }),
      this.autoOrderRepo.count({ where: { tenantId, status: 'diagnosing'  } }),
      this.autoOrderRepo.count({ where: { tenantId, status: 'in_progress' } }),
      this.autoOrderRepo.count({ where: { tenantId, status: 'ready'       } }),
      this.autoOrderRepo.count({
        where: { tenantId, createdAt: Between(startToday, endToday) },
      }),
      this.autoOrderRepo.find({
        where: { tenantId, createdAt: Between(weekStart, endToday) },
        order: { createdAt: 'ASC' },
      }),
      this.autoOrderRepo.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take:  8,
      }),
    ]);

    // weekly revenue chart
    const weeklyMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * 86400000);
      weeklyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of weekOrders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + Number(o.totalCost));
    }
    const weeklyRevenue = Array.from(weeklyMap.entries()).map(([date, revenue]) => ({ date, revenue }));

    // most common work item names
    const workItemMap = new Map<string, number>();
    for (const o of weekOrders) {
      for (const wi of (o.workItems as WorkItem[])) {
        workItemMap.set(wi.name, (workItemMap.get(wi.name) ?? 0) + wi.qty);
      }
    }
    const topWorkItems = [...workItemMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    const active = receivedCount + diagnosingCount + inProgressCount + readyCount;
    const weekRevenue = weekOrders.reduce((s, o) => s + Number(o.totalCost), 0);

    const recent = recentRaw.map(o => ({
      id:          o.id,
      vehicleInfo: o.vehicleInfo,
      plateNumber: o.plateNumber,
      customerName: o.customerName,
      status:      o.status,
      totalCost:   Number(o.totalCost),
      createdAt:   o.createdAt,
    }));

    return {
      active,
      received:      receivedCount,
      diagnosing:    diagnosingCount,
      inProgress:    inProgressCount,
      ready:         readyCount,
      totalToday,
      weekRevenue,
      weeklyRevenue,
      topWorkItems,
      recent,
    };
  }
}
