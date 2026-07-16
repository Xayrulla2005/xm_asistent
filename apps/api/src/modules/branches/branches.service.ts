import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { BranchTransfer, TransferStatus } from './entities/branch-transfer.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(BranchTransfer)
    private readonly transferRepo: Repository<BranchTransfer>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateBranchDto): Promise<Branch> {
    const branch = this.branchRepo.create({
      tenantId,
      name:        dto.name,
      address:     dto.address     ?? null,
      phone:       dto.phone       ?? null,
      managerName: dto.managerName ?? null,
      notes:       dto.notes       ?? null,
      isActive:    dto.isActive    ?? true,
    });
    return this.branchRepo.save(branch);
  }

  async findAll(tenantId: string): Promise<(Branch & { transferCount: number })[]> {
    const branches = await this.branchRepo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });

    // Attach transfer counts per branch
    const counts = await this.transferRepo
      .createQueryBuilder('t')
      .select('t."toBranchId"', 'branchId')
      .addSelect('COUNT(*)', 'cnt')
      .where('t."tenantId" = :tid', { tid: tenantId })
      .andWhere('t.status = :s', { s: TransferStatus.COMPLETED })
      .groupBy('t."toBranchId"')
      .getRawMany<{ branchId: string; cnt: string }>();

    const countMap = new Map(counts.map((r) => [r.branchId, Number(r.cnt)]));

    return branches.map((b) => ({
      ...b,
      transferCount: countMap.get(b.id) ?? 0,
    }));
  }

  async findOne(tenantId: string, id: string): Promise<Branch> {
    const b = await this.branchRepo.findOne({ where: { id, tenantId } });
    if (!b) throw new NotFoundException('Filial topilmadi');
    return b;
  }

  async update(tenantId: string, id: string, dto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(tenantId, id);
    Object.assign(branch, dto);
    return this.branchRepo.save(branch);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const branch = await this.findOne(tenantId, id);
    await this.branchRepo.remove(branch);
  }

  // ── Transfers ────────────────────────────────────────────────────────────────

  async createTransfer(
    tenantId: string,
    dto: CreateTransferDto,
    initiatedBy?: string,
  ): Promise<BranchTransfer> {
    if (dto.fromBranchId && dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException("Manba va maqsad filial bir xil bo'lishi mumkin emas");
    }

    // Validate product exists
    const product = await this.productRepo.findOne({
      where: { id: dto.productId, tenantId },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    // Validate stock sufficiency from source
    if (product.quantity < dto.quantity) {
      throw new BadRequestException(
        `Skladda yetarli mahsulot yo'q. Mavjud: ${product.quantity}, so'ralgan: ${dto.quantity}`,
      );
    }

    // Deduct from global stock (transfer reduces and re-adds — net 0 for global)
    // In a multi-branch system, global stock is the union of all branch stocks.
    // Here we track transfers but keep global product.quantity unchanged.
    // (Branch-level inventory is derived from branch_transfers table.)

    const transfer = this.transferRepo.create({
      tenantId,
      fromBranchId: dto.fromBranchId ?? null,
      toBranchId:   dto.toBranchId   ?? null,
      productId:    dto.productId,
      productName:  product.name,
      quantity:     dto.quantity,
      unitCost:     dto.unitCost ?? Number(product.price ?? 0),
      status:       TransferStatus.COMPLETED,
      notes:        dto.notes ?? null,
      initiatedBy:  initiatedBy ?? null,
    });

    return this.transferRepo.save(transfer);
  }

  async getTransfers(tenantId: string, filters: {
    branchId?: string;
    page?:     number;
    limit?:    number;
  }): Promise<{ data: BranchTransfer[]; total: number }> {
    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(100, filters.limit ?? 30);

    const qb = this.transferRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.fromBranch', 'fb')
      .leftJoinAndSelect('t.toBranch',   'tb')
      .where('t."tenantId" = :tid', { tid: tenantId })
      .orderBy('t."createdAt"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.branchId) {
      qb.andWhere(
        '(t."fromBranchId" = :bid OR t."toBranchId" = :bid)',
        { bid: filters.branchId },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  async getStats(tenantId: string) {
    const [total, active] = await Promise.all([
      this.branchRepo.count({ where: { tenantId } }),
      this.branchRepo.count({ where: { tenantId, isActive: true } }),
    ]);

    const transfersToday = await this.transferRepo
      .createQueryBuilder('t')
      .where('t."tenantId" = :tid', { tid: tenantId })
      .andWhere('t."createdAt" >= :today', { today: new Date(new Date().toISOString().split('T')[0]) })
      .getCount();

    // Per-branch inventory derived from transfers
    const inventoryRaw = await this.dataSource.query<{
      branchId: string; productName: string; qty: string;
    }[]>(`
      SELECT
        "toBranchId" AS "branchId",
        "productName",
        SUM(quantity)::int AS qty
      FROM branch_transfers
      WHERE "tenantId" = $1
        AND status = 'completed'
        AND "toBranchId" IS NOT NULL
      GROUP BY "toBranchId", "productName"
      ORDER BY "branchId", qty DESC
    `, [tenantId]);

    // Group by branch
    const inventoryByBranch: Record<string, { productName: string; qty: number }[]> = {};
    for (const row of inventoryRaw) {
      if (!inventoryByBranch[row.branchId]) inventoryByBranch[row.branchId] = [];
      inventoryByBranch[row.branchId].push({ productName: row.productName, qty: Number(row.qty) });
    }

    return { total, active, transfersToday, inventoryByBranch };
  }

  async getBranchInventory(tenantId: string, branchId: string): Promise<{
    productId: string; productName: string; incoming: number; outgoing: number; net: number;
  }[]> {
    await this.findOne(tenantId, branchId);

    const rows = await this.dataSource.query<{
      productId: string; productName: string; direction: 'in' | 'out'; qty: string;
    }[]>(`
      SELECT
        "productId",
        "productName",
        CASE WHEN "toBranchId" = $2 THEN 'in' ELSE 'out' END AS direction,
        SUM(quantity)::int AS qty
      FROM branch_transfers
      WHERE "tenantId" = $1
        AND status = 'completed'
        AND ("toBranchId" = $2 OR "fromBranchId" = $2)
      GROUP BY "productId", "productName", direction
    `, [tenantId, branchId]);

    // Merge in + out per product
    const map = new Map<string, { productId: string; productName: string; incoming: number; outgoing: number }>();
    for (const r of rows) {
      if (!map.has(r.productId)) {
        map.set(r.productId, { productId: r.productId, productName: r.productName, incoming: 0, outgoing: 0 });
      }
      const entry = map.get(r.productId)!;
      if (r.direction === 'in')  entry.incoming += Number(r.qty);
      else                        entry.outgoing += Number(r.qty);
    }

    return [...map.values()]
      .map((e) => ({ ...e, net: e.incoming - e.outgoing }))
      .sort((a, b) => b.net - a.net);
  }
}
