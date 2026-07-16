import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GeneratedCrm } from '../crm-engine/entities/generated-crm.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { Sale } from '../sales/entities/sale.entity';
import { WizardConfig } from '../wizard/entities/wizard-config.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)         private readonly repo: Repository<Tenant>,
    @InjectRepository(WizardConfig)   private readonly wizardRepo: Repository<WizardConfig>,
    @InjectRepository(Sale)           private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Product)        private readonly productRepo: Repository<Product>,
    @InjectRepository(Customer)       private readonly customerRepo: Repository<Customer>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const slug = dto.slug ?? this.toSlug(dto.name);
    await this.assertSlugFree(slug);
    const tenant = this.repo.create({
      name: dto.name, slug, ownerId: dto.ownerId,
      config: dto.config ?? {}, isActive: dto.isActive ?? true,
    });
    return this.repo.save(tenant);
  }

  async findAll() {
    const [tenants, wizardConfigs] = await Promise.all([
      this.repo.find({ order: { createdAt: 'DESC' } }),
      this.wizardRepo.find(),
    ]);
    const wcMap = new Map(wizardConfigs.map((wc) => [wc.tenantId, wc]));
    return tenants.map((t) => ({
      ...t,
      industry:    wcMap.get(t.id)?.industry ?? null,
      moduleCount: wcMap.get(t.id)?.modules?.length ?? 0,
    }));
  }

  async findPublic() {
    const [tenants, wizardConfigs] = await Promise.all([
      this.repo.find({ where: { isActive: true }, order: { createdAt: 'DESC' } }),
      this.wizardRepo.find(),
    ]);
    const wcMap = new Map(wizardConfigs.map((wc) => [wc.tenantId, wc]));
    return tenants.map((t) => {
      const wc = wcMap.get(t.id);
      return {
        id:           t.id,
        name:         t.name,
        slug:         t.slug,
        industry:     wc?.industry ?? null,
        logoUrl:      wc?.logoUrl ?? null,
        primaryColor: (wc?.theme as Record<string, unknown> | undefined)?.['primaryColor'] as string | null ?? null,
        shopName:     (wc?.theme as Record<string, unknown> | undefined)?.['shopName'] as string | null ?? t.name,
      };
    });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant #${id} topilmadi`);
    return tenant;
  }

  async findOneRich(id: string) {
    const tenant = await this.findOne(id);

    const [
      wizardConfig, totalSales, totalProducts, totalCustomers,
      revenueRaw, monthlyRevenueRaw, lastSale,
      weeklyRaw, topProductsRaw, paymentRaw, employeeRaw,
    ] = await Promise.all([
      this.wizardRepo.findOne({ where: { tenantId: id } }),
      this.saleRepo.count({ where: { tenantId: id } }),
      this.productRepo.count({ where: { tenantId: id } }),
      this.customerRepo.count({ where: { tenantId: id } }),
      this.dataSource.query<{ total: string }[]>(
        `SELECT COALESCE(SUM("totalAmount"), 0)::float AS total FROM sales WHERE "tenantId" = $1`,
        [id],
      ),
      this.dataSource.query<{ total: string }[]>(
        `SELECT COALESCE(SUM("totalAmount"), 0)::float AS total FROM sales
         WHERE "tenantId" = $1 AND "createdAt" >= NOW() - INTERVAL '30 days'`,
        [id],
      ),
      this.saleRepo.findOne({ where: { tenantId: id }, order: { createdAt: 'DESC' } }),
      this.dataSource.query<{ date: string; revenue: string; salesCount: string }[]>(
        `SELECT DATE("createdAt") AS date,
                COALESCE(SUM("totalAmount"), 0)::float AS revenue,
                COUNT(id)::int AS "salesCount"
         FROM sales
         WHERE "tenantId" = $1 AND "createdAt" >= NOW() - INTERVAL '7 days'
         GROUP BY DATE("createdAt")`,
        [id],
      ),
      this.dataSource.query<{ name: string; totalQty: string; totalRevenue: string }[]>(
        `SELECT item->>'name' AS name,
                SUM((item->>'quantity')::int)::int AS "totalQty",
                SUM((item->>'price')::float * (item->>'quantity')::int)::float AS "totalRevenue"
         FROM sales, jsonb_array_elements(items) AS item
         WHERE "tenantId" = $1 AND jsonb_typeof(items) = 'array'
         GROUP BY item->>'name'
         ORDER BY "totalQty" DESC
         LIMIT 5`,
        [id],
      ),
      this.dataSource.query<{ paymentType: string; cnt: string }[]>(
        `SELECT "paymentType", COUNT(id)::int AS cnt FROM sales
         WHERE "tenantId" = $1 GROUP BY "paymentType"`,
        [id],
      ),
      this.dataSource.query<{ cnt: string }[]>(
        `SELECT COUNT(id)::int AS cnt FROM employees WHERE "tenantId" = $1`,
        [id],
      ),
    ]);

    const totalRevenue     = Number(revenueRaw[0]?.total ?? 0);
    const monthlyRevenue   = Number(monthlyRevenueRaw[0]?.total ?? 0);
    const avgOrderValue    = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
    const weeklyChart      = this.fillWeekly(weeklyRaw);
    const topProducts      = topProductsRaw.map((r) => ({
      name:         r.name,
      totalQty:     Number(r.totalQty),
      totalRevenue: Number(r.totalRevenue),
    }));
    const totalPmts = paymentRaw.reduce((s, r) => s + Number(r.cnt), 0) || 1;
    const pct = (type: string) =>
      Math.round((paymentRaw.find((r) => r.paymentType === type)?.cnt as unknown as number ?? 0) / totalPmts * 100);
    const paymentBreakdown = { cash: pct('cash'), card: pct('card'), credit: pct('credit') };

    return {
      id: tenant.id, name: tenant.name, slug: tenant.slug,
      isActive: tenant.isActive, createdAt: tenant.createdAt,
      wizardConfig: wizardConfig ?? null,
      stats: {
        totalSales, totalRevenue, totalProducts, totalCustomers,
        totalEmployees: Number(employeeRaw[0]?.cnt ?? 0),
        avgOrderValue, monthlyRevenue, lastActivity: lastSale?.createdAt ?? null,
        weeklyChart, topProducts, paymentBreakdown,
      },
    };
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (dto.name && !dto.slug) dto.slug = this.toSlug(dto.name);
    if (dto.slug && dto.slug !== tenant.slug) await this.assertSlugFree(dto.slug);
    Object.assign(tenant, dto);
    return this.repo.save(tenant);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // branch_transfers has FK → branches (SET NULL), delete transfers first
      await qr.query(`DELETE FROM branch_transfers WHERE "tenantId" = $1`, [id]);
      await qr.query(`DELETE FROM branches WHERE "tenantId" = $1`, [id]);

      // billing
      await qr.query(`DELETE FROM payment_history WHERE "tenantId" = $1`, [id]);
      await qr.query(`DELETE FROM subscriptions WHERE "tenantId" = $1`, [id]);

      // sales & inventory
      await qr.query(`DELETE FROM sale_returns WHERE "tenantId" = $1`, [id]);
      await qr.query(`DELETE FROM inventory_movements WHERE "tenantId" = $1`, [id]);
      await qr.query(`DELETE FROM warehouse_logs WHERE "tenantId" = $1`, [id]);
      await qr.query(`DELETE FROM payments WHERE "tenantId" = $1`, [id]);
      await qr.query(`DELETE FROM debts WHERE "tenantId" = $1`, [id]);
      await qr.manager.delete(Sale, { tenantId: id });

      // crm data
      await qr.manager.delete(Customer, { tenantId: id });
      await qr.manager.delete(Product, { tenantId: id });
      await qr.query(`DELETE FROM employees WHERE "tenantId" = $1`, [id]);
      await qr.query(`DELETE FROM audit_logs WHERE "tenantId" = $1`, [id]);

      // config
      await qr.manager.delete(WizardConfig, { tenantId: id });
      await qr.manager.delete(GeneratedCrm, { tenantId: id });

      // unlink users, then delete tenant
      await qr.query(`UPDATE users SET "tenantId" = NULL WHERE "tenantId" = $1`, [id]);
      await qr.manager.delete(Tenant, { id });

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  private fillWeekly(raw: { date: string; revenue: string; salesCount: string }[]) {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const found   = raw.find((r) => String(r.date).startsWith(dateStr));
      return { date: dateStr, revenue: found ? Number(found.revenue) : 0, salesCount: found ? Number(found.salesCount) : 0 };
    });
  }

  private toSlug(name: string): string {
    return name.toLowerCase().trim()
      .replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  }

  private async assertSlugFree(slug: string): Promise<void> {
    const exists = await this.repo.findOne({ where: { slug } });
    if (exists) throw new ConflictException(`"${slug}" slug allaqachon band`);
  }
}
