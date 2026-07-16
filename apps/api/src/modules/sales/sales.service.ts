import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleStatusDto } from './dto/update-sale-status.dto';
import { Sale, SaleStatus } from './entities/sale.entity';
import { SaleReturn, ReturnItem, ReturnStatus } from './entities/sale-return.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { InventoryMovement, MovementType } from '../warehouse/entities/inventory-movement.entity';
import { DebtsService } from '../debts/debts.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly repo: Repository<Sale>,
    @InjectRepository(SaleReturn)
    private readonly returnRepo: Repository<SaleReturn>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    private readonly debtsService: DebtsService,
  ) {}

  async create(dto: CreateSaleDto): Promise<Sale> {
    const subtotal      = dto.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalDiscount = dto.items.reduce((sum, i) => sum + (i.discount ?? 0), 0);
    const totalAmount   = subtotal - totalDiscount;

    const partialPaid      = dto.partialPaid      ?? null;
    const partialRemaining = partialPaid != null ? totalAmount - partialPaid : null;

    // Stok tekshiruvi — save() DAN OLDIN, aks holda orphaned sale yozuvi qoladi
    for (const i of dto.items) {
      const product = await this.productRepo.findOne({ where: { id: i.productId, tenantId: dto.tenantId } });
      if (!product) continue;
      if (product.quantity < i.quantity) {
        throw new BadRequestException(
          `"${i.name}" uchun yetarli stok yo'q. Mavjud: ${product.quantity}, kerak: ${i.quantity}`,
        );
      }
    }

    const sale = this.repo.create({
      tenantId:     dto.tenantId,
      customerName: dto.customerName ?? '',
      customerId:   dto.customerId   ?? null,
      items: dto.items.map((i) => ({
        productId: i.productId,
        name:      i.name,
        price:     i.price,
        quantity:  i.quantity,
        discount:  i.discount ?? 0,
      })),
      discount:         totalDiscount,
      totalAmount,
      paymentType:      dto.paymentType      ?? 'cash',
      cashReceived:     dto.cashReceived     ?? null,
      change:           dto.change           ?? null,
      mixedCash:        dto.mixedCash        ?? null,
      mixedCard:        dto.mixedCard        ?? null,
      mixedTransfer:    dto.mixedTransfer    ?? null,
      currency:         dto.currency         ?? 'uzs',
      currencyRate:     dto.currencyRate      ?? 1,
      amountInCurrency: dto.amountInCurrency  ?? null,
      partialPaid,
      partialRemaining,
      status: SaleStatus.COMPLETED,
    });

    const saved = await this.repo.save(sale);

    await Promise.all(
      dto.items.map(async (i) => {
        const product = await this.productRepo.findOne({ where: { id: i.productId, tenantId: dto.tenantId } });
        if (!product) return;
        const stockBefore = Number(product.quantity);
        const stockAfter  = stockBefore - i.quantity;
        await this.productRepo.decrement({ id: i.productId }, 'quantity', i.quantity);
        await this.movementRepo.save(
          this.movementRepo.create({
            tenantId:    dto.tenantId,
            productId:   i.productId,
            productName: i.name,
            type:        MovementType.SALE,
            quantity:    i.quantity,
            stockBefore,
            stockAfter,
            referenceId: saved.id,
          }),
        );
      }),
    );

    // Qarz yozish
    const customerName = dto.customerName ?? '';
    if (dto.paymentType === 'credit') {
      if (dto.customerId) {
        await this.customerRepo.increment({ id: dto.customerId, tenantId: dto.tenantId }, 'totalDebt', totalAmount);
      }
      await this.debtsService.create({
        tenantId:     dto.tenantId,
        saleId:       saved.id,
        customerId:   dto.customerId ?? null,
        customerName,
        amount:       totalAmount,
      });
    }

    if (dto.paymentType === 'partial' && partialRemaining != null && partialRemaining > 0) {
      if (dto.customerId) {
        await this.customerRepo.increment({ id: dto.customerId, tenantId: dto.tenantId }, 'totalDebt', partialRemaining);
      }
      await this.debtsService.create({
        tenantId:     dto.tenantId,
        saleId:       saved.id,
        customerId:   dto.customerId ?? null,
        customerName,
        amount:       partialRemaining,
      });
    }

    return saved;
  }

  findAll(tenantId: string): Promise<Sale[]> {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Sale & { debt?: unknown }> {
    const sale = await this.repo.findOne({ where: { id, tenantId } });
    if (!sale) throw new NotFoundException(`Sale #${id} topilmadi`);
    const debt = await this.debtsService.findBySale(id, tenantId);
    return { ...sale, debt: debt ?? null };
  }

  async updateStatus(id: string, dto: UpdateSaleStatusDto, tenantId: string): Promise<Sale> {
    const sale = await this.repo.findOne({ where: { id, tenantId } });
    if (!sale) throw new NotFoundException(`Sale #${id} topilmadi`);
    sale.status = dto.status;
    return this.repo.save(sale);
  }

  async createReturn(
    saleId: string,
    items: ReturnItem[],
    reason: string | undefined,
    tenantId: string,
  ): Promise<SaleReturn> {
    const sale = await this.repo.findOne({ where: { id: saleId, tenantId } });
    if (!sale) throw new NotFoundException(`Sale #${saleId} topilmadi`);
    if (sale.status === SaleStatus.CANCELLED)
      throw new BadRequestException('Bekor qilingan sotuvni qaytarib bo\'lmaydi');

    const totalRefund = items.reduce((s, i) => s + i.price * i.quantity, 0);

    const saleReturn = await this.returnRepo.save(
      this.returnRepo.create({
        tenantId: sale.tenantId,
        saleId,
        items,
        reason:      reason ?? null,
        status:      ReturnStatus.PENDING,
        totalRefund,
      }),
    );

    // Stok qaytarish faqat return APPROVED bo'lganda amalga oshiriladi.
    // Shuning uchun bu yerda stokni o'zgartirmaymiz — updateReturnStatus(APPROVED) da qilinadi.

    if (items.length === sale.items.length) {
      // To'liq qaytarish — sotuvni bekor qilish
      sale.status = SaleStatus.CANCELLED;
      await this.repo.save(sale);
    }

    return saleReturn;
  }

  findReturns(saleId: string, tenantId: string): Promise<SaleReturn[]> {
    return this.returnRepo.find({ where: { saleId, tenantId }, order: { createdAt: 'DESC' } });
  }

  findAllReturns(tenantId: string): Promise<SaleReturn[]> {
    return this.returnRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async updateReturnStatus(id: string, status: ReturnStatus, tenantId: string): Promise<SaleReturn> {
    const ret = await this.returnRepo.findOne({ where: { id, tenantId } });
    if (!ret) throw new NotFoundException(`Return #${id} topilmadi`);

    const wasApproved = ret.status === ReturnStatus.APPROVED;
    ret.status = status;
    const saved = await this.returnRepo.save(ret);

    // Stok qaytarish faqat bir marta — APPROVED ga o'tganda
    if (status === ReturnStatus.APPROVED && !wasApproved) {
      const sale = await this.repo.findOne({ where: { id: ret.saleId, tenantId: ret.tenantId } });
      await Promise.all(
        ret.items.map(async (i) => {
          const product = await this.productRepo.findOne({ where: { id: i.productId, tenantId: ret.tenantId } });
          if (!product) return;
          const stockBefore = Number(product.quantity);
          const stockAfter  = stockBefore + i.quantity;
          await this.productRepo.increment({ id: i.productId }, 'quantity', i.quantity);
          await this.movementRepo.save(
            this.movementRepo.create({
              tenantId:    ret.tenantId,
              productId:   i.productId,
              productName: i.name,
              type:        MovementType.RETURN,
              quantity:    i.quantity,
              stockBefore,
              stockAfter,
              referenceId: ret.id,
            }),
          );
        }),
      );
      if (sale && sale.items.length === ret.items.length) {
        sale.status = SaleStatus.CANCELLED;
        await this.repo.save(sale);
      }
    }

    return saved;
  }

  async getStats(tenantId?: string) {
    const today      = new Date();
    const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const endOfDay   = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

    const qb = this.repo
      .createQueryBuilder('sale')
      .where('sale.createdAt BETWEEN :startOfDay AND :endOfDay', { startOfDay, endOfDay })
      .andWhere('sale.status != :cancelled', { cancelled: SaleStatus.CANCELLED });

    if (tenantId) qb.andWhere('sale.tenantId = :tenantId', { tenantId });

    const sales = await qb.getMany();

    const totalAmount = sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);
    const uniqueCustomers = new Set(
      sales.filter((s) => s.customerName).map((s) => s.customerName),
    ).size;

    // To'lov usuli bo'yicha taqsimot
    const byPayment = sales.reduce<Record<string, number>>((acc, s) => {
      acc[s.paymentType] = (acc[s.paymentType] ?? 0) + Number(s.totalAmount);
      return acc;
    }, {});

    // Top 5 mahsulot (miqdor bo'yicha)
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const s of sales) {
      for (const item of s.items) {
        const existing = productMap.get(item.productId) ?? { name: item.name, qty: 0, revenue: 0 };
        existing.qty     += item.quantity;
        existing.revenue += item.price * item.quantity - (item.discount ?? 0);
        productMap.set(item.productId, existing);
      }
    }
    const topProducts = [...productMap.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      totalSales:      sales.length,
      totalAmount,
      totalCustomers:  uniqueCustomers,
      byPayment,
      topProducts,
    };
  }

  async exportExcel(
    tenantId: string,
    from?: string,
    to?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const where: Record<string, unknown> = { tenantId };
    if (from && to) {
      where['createdAt'] = Between(new Date(from), new Date(to));
    }
    const sales = await this.repo.find({ where, order: { createdAt: 'DESC' } });

    const wb  = new ExcelJS.Workbook();
    const ws  = wb.addWorksheet('Sotuvlar');

    ws.columns = [
      { header: '№',            key: 'seq',         width: 6  },
      { header: 'Sana',         key: 'date',         width: 20 },
      { header: 'Mijoz',        key: 'customer',     width: 22 },
      { header: 'Tovarlar',     key: 'items',        width: 40 },
      { header: 'Chegirma',     key: 'discount',     width: 14 },
      { header: 'Jami',         key: 'total',        width: 14 },
      { header: "To'lov usuli", key: 'payment',      width: 14 },
      { header: 'Status',       key: 'status',       width: 12 },
    ];

    ws.getRow(1).font      = { bold: true };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const statusMap: Record<string, string> = {
      completed: 'Bajarildi',
      pending:   'Kutilmoqda',
      cancelled: 'Bekor',
    };
    const paymentMap: Record<string, string> = {
      cash:     'Naqd',
      card:     'Karta',
      transfer: 'O\'tkazma',
      credit:   'Nasiya',
      partial:  'Qisman',
      mixed:    'Aralash',
    };

    sales.forEach((s, idx) => {
      const itemsText = s.items
        .map((i) => `${i.name} x${i.quantity}`)
        .join(', ');
      ws.addRow({
        seq:      idx + 1,
        date:     new Date(s.createdAt).toLocaleString('uz-UZ'),
        customer: s.customerName || '—',
        items:    itemsText,
        discount: Number(s.discount),
        total:    Number(s.totalAmount),
        payment:  paymentMap[s.paymentType] ?? s.paymentType,
        status:   statusMap[s.status] ?? s.status,
      });
    });

    const buffer   = Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer);
    const today    = new Date().toISOString().slice(0, 10);
    const filename = `sotuvlar_${today}.xlsx`;
    return { buffer, filename };
  }

  async getReceipt(id: string) {
    const sale = await this.repo.findOne({ where: { id } });
    if (!sale) throw new NotFoundException(`Sale #${id} topilmadi`);

    const seq = await this.repo
      .createQueryBuilder('s')
      .where('s.tenantId = :tenantId', { tenantId: sale.tenantId })
      .andWhere('s.createdAt <= :createdAt', { createdAt: sale.createdAt })
      .getCount();

    const subtotal = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const d   = sale.createdAt instanceof Date ? sale.createdAt : new Date(sale.createdAt);
    const ymd =
      String(d.getFullYear()) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    const receiptNumber = `SALE-${ymd}-${String(seq).padStart(4, '0')}`;

    let customerPhone: string | null = null;
    let totalDebt: number | null     = null;
    if (sale.customerId) {
      const customer = await this.customerRepo.findOne({ where: { id: sale.customerId } });
      if (customer) {
        customerPhone = customer.phone ?? null;
        totalDebt     = Number(customer.totalDebt);
      }
    }

    return {
      id:               sale.id,
      tenantId:         sale.tenantId,
      receiptNumber,
      createdAt:        sale.createdAt,
      sellerName:       'Sotuvchi',
      items: sale.items.map((item) => ({
        name:     item.name,
        price:    item.price,
        quantity: item.quantity,
        discount: item.discount ?? 0,
        subtotal: item.price * item.quantity - (item.discount ?? 0),
      })),
      subtotal,
      discount:         Number(sale.discount),
      total:            Number(sale.totalAmount),
      paymentType:      sale.paymentType,
      cashReceived:     sale.cashReceived     != null ? Number(sale.cashReceived)     : null,
      change:           sale.change           != null ? Number(sale.change)           : null,
      mixedCash:        sale.mixedCash        != null ? Number(sale.mixedCash)        : null,
      mixedCard:        sale.mixedCard        != null ? Number(sale.mixedCard)        : null,
      mixedTransfer:    sale.mixedTransfer    != null ? Number(sale.mixedTransfer)    : null,
      partialPaid:      sale.partialPaid      != null ? Number(sale.partialPaid)      : null,
      partialRemaining: sale.partialRemaining != null ? Number(sale.partialRemaining) : null,
      customerName:     sale.customerName     || null,
      customerPhone,
      totalDebt,
      currency:         sale.currency,
      currencyRate:     Number(sale.currencyRate),
      amountInCurrency: sale.amountInCurrency != null ? Number(sale.amountInCurrency) : null,
    };
  }
}
