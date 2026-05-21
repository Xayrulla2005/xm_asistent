import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleStatusDto } from './dto/update-sale-status.dto';
import { Sale, SaleStatus } from './entities/sale.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly repo: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateSaleDto): Promise<Sale> {
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const totalDiscount = dto.items.reduce(
      (sum, item) => sum + (item.discount ?? 0),
      0,
    );
    const totalAmount = subtotal - totalDiscount;

    const sale = this.repo.create({
      tenantId: dto.tenantId,
      customerName: dto.customerName ?? '',
      items: dto.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        discount: item.discount ?? 0,
      })),
      discount: totalDiscount,
      totalAmount,
      paymentType: dto.paymentType ?? 'cash',
      cashReceived: dto.cashReceived ?? null,
      change: dto.change ?? null,
      mixedCash: dto.mixedCash ?? null,
      mixedCard: dto.mixedCard ?? null,
      status: SaleStatus.COMPLETED,
    });

    const saved = await this.repo.save(sale);

    await Promise.all(
      dto.items.map((item) =>
        this.productRepo.decrement({ id: item.productId }, 'quantity', item.quantity),
      ),
    );

    return saved;
  }

  findAll(tenantId?: string): Promise<Sale[]> {
    const where = tenantId ? { tenantId } : {};
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Sale> {
    const sale = await this.repo.findOne({ where: { id } });
    if (!sale) throw new NotFoundException(`Sale #${id} topilmadi`);
    return sale;
  }

  async updateStatus(id: string, dto: UpdateSaleStatusDto): Promise<Sale> {
    const sale = await this.findOne(id);
    sale.status = dto.status;
    return this.repo.save(sale);
  }

  async getStats(tenantId?: string) {
    const today = new Date();
    const startOfDay = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0),
    );
    const endOfDay = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
    );

    const qb = this.repo
      .createQueryBuilder('sale')
      .where('sale.createdAt BETWEEN :startOfDay AND :endOfDay', { startOfDay, endOfDay })
      .andWhere('sale.status != :cancelled', { cancelled: SaleStatus.CANCELLED });

    if (tenantId) qb.andWhere('sale.tenantId = :tenantId', { tenantId });

    const sales = await qb.getMany();
    const totalAmount = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const uniqueCustomers = new Set(
      sales.filter((s) => s.customerName).map((s) => s.customerName),
    ).size;

    return { totalSales: sales.length, totalAmount, totalCustomers: uniqueCustomers };
  }

  async getReceipt(id: string) {
    const sale = await this.findOne(id);

    const seq = await this.repo
      .createQueryBuilder('s')
      .where('s.tenantId = :tenantId', { tenantId: sale.tenantId })
      .andWhere('s.createdAt <= :createdAt', { createdAt: sale.createdAt })
      .getCount();

    const subtotal = sale.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    return {
      receiptNumber: String(seq).padStart(4, '0'),
      createdAt: sale.createdAt,
      sellerName: 'Sotuvchi',
      items: sale.items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        discount: item.discount ?? 0,
        subtotal: item.price * item.quantity - (item.discount ?? 0),
      })),
      subtotal,
      discount: Number(sale.discount),
      total: Number(sale.totalAmount),
      paymentType: sale.paymentType,
      cashReceived: sale.cashReceived != null ? Number(sale.cashReceived) : null,
      change: sale.change != null ? Number(sale.change) : null,
      mixedCash: sale.mixedCash != null ? Number(sale.mixedCash) : null,
      mixedCard: sale.mixedCard != null ? Number(sale.mixedCard) : null,
      customerName: sale.customerName,
    };
  }
}
