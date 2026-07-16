import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { WarehouseLog, WarehouseLogType } from './entities/warehouse-log.entity';
import { CreateWarehouseLogDto } from './dto/create-warehouse-log.dto';
import { Product } from '../products/entities/product.entity';

const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(WarehouseLog)
    private readonly logRepo: Repository<WarehouseLog>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateWarehouseLogDto): Promise<WarehouseLog> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId, tenantId: dto.tenantId } });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    if (dto.type === WarehouseLogType.EXPENSE && product.quantity < dto.quantity) {
      throw new BadRequestException(
        `Skladda yetarli mahsulot yo'q. Mavjud: ${product.quantity}`,
      );
    }

    const totalAmount = dto.quantity * dto.price;

    const log = this.logRepo.create({
      tenantId:    dto.tenantId,
      productId:   dto.productId,
      productName: product.name,
      type:        dto.type,
      quantity:    dto.quantity,
      price:       dto.price,
      totalAmount,
      reason:      dto.reason ?? null,
    });

    await this.logRepo.save(log);

    // Mahsulot miqdorini yangilash
    product.quantity =
      dto.type === WarehouseLogType.INCOME
        ? product.quantity + dto.quantity
        : product.quantity - dto.quantity;

    await this.productRepo.save(product);

    return log;
  }

  findAll(tenantId?: string, type?: WarehouseLogType): Promise<WarehouseLog[]> {
    const qb = this.logRepo
      .createQueryBuilder('l')
      .orderBy('l.createdAt', 'DESC');

    if (tenantId) qb.andWhere('l.tenantId = :tenantId', { tenantId });
    if (type)     qb.andWhere('l.type = :type', { type });

    return qb.getMany();
  }

  async getStats(tenantId?: string): Promise<{
    totalIncome: number;
    totalExpense: number;
    lowStockCount: number;
  }> {
    const qb = this.logRepo.createQueryBuilder('l');
    if (tenantId) qb.where('l.tenantId = :tenantId', { tenantId });
    const logs = await qb.getMany();

    const totalIncome  = logs
      .filter((l) => l.type === WarehouseLogType.INCOME)
      .reduce((s, l) => s + Number(l.totalAmount), 0);
    const totalExpense = logs
      .filter((l) => l.type === WarehouseLogType.EXPENSE)
      .reduce((s, l) => s + Number(l.totalAmount), 0);

    const lowStockCount = await this.productRepo.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        quantity: LessThan(LOW_STOCK_THRESHOLD),
      },
    });

    return { totalIncome, totalExpense, lowStockCount };
  }

  getLowStock(tenantId?: string): Promise<Product[]> {
    return this.productRepo.find({
      where: {
        ...(tenantId ? { tenantId } : {}),
        quantity: LessThan(LOW_STOCK_THRESHOLD),
      },
      order: { quantity: 'ASC' },
    });
  }
}
