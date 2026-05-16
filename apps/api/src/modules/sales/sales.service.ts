import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleStatusDto } from './dto/update-sale-status.dto';
import { Sale, SaleStatus } from './entities/sale.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly repo: Repository<Sale>,
  ) {}

  create(dto: CreateSaleDto): Promise<Sale> {
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const sale = this.repo.create({
      tenantId: dto.tenantId,
      customerName: dto.customerName,
      items: dto.items,
      totalAmount,
      paymentType: dto.paymentType,
      status: SaleStatus.PENDING,
    });
    return this.repo.save(sale);
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

  async getStats(tenantId?: string): Promise<{
    totalSales: number;
    totalAmount: number;
    totalCustomers: number;
  }> {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0, 0, 0, 0,
    ));
    const endOfDay = new Date(Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23, 59, 59, 999,
    ));

    const qb = this.repo
      .createQueryBuilder('sale')
      .where('sale.createdAt BETWEEN :startOfDay AND :endOfDay', { startOfDay, endOfDay })
      .andWhere('sale.status != :cancelled', { cancelled: SaleStatus.CANCELLED });

    if (tenantId) {
      qb.andWhere('sale.tenantId = :tenantId', { tenantId });
    }

    const sales = await qb.getMany();

    const totalAmount = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const uniqueCustomers = new Set(sales.map((s) => s.customerName)).size;

    return {
      totalSales: sales.length,
      totalAmount,
      totalCustomers: uniqueCustomers,
    };
  }
}
