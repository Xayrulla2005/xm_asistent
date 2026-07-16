import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { AutoVehicle } from './entities/auto-vehicle.entity';
import {
  AutoServiceOrder,
  AutoServiceOrderStatus,
  WorkItem,
} from './entities/auto-service-order.entity';

const STATUS_SEQUENCE: AutoServiceOrderStatus[] = [
  'received',
  'diagnosing',
  'in_progress',
  'ready',
  'delivered',
];

function computeTotalCost(workItems: WorkItem[]): number {
  return workItems.reduce((s, i) => s + i.qty * i.price, 0);
}

@Injectable()
export class AutoService {
  constructor(
    @InjectRepository(AutoVehicle)       private readonly vehicleRepo: Repository<AutoVehicle>,
    @InjectRepository(AutoServiceOrder)  private readonly orderRepo:   Repository<AutoServiceOrder>,
  ) {}

  // ── Vehicles ────────────────────────────────────────────────────────────────

  findVehicles(tenantId: string, search?: string) {
    if (search) {
      const q = `%${search}%`;
      return this.vehicleRepo.find({
        where: [
          { tenantId, brand:        ILike(q) },
          { tenantId, model:        ILike(q) },
          { tenantId, plateNumber:  ILike(q) },
          { tenantId, customerName: ILike(q) },
        ],
        order: { createdAt: 'DESC' },
      });
    }
    return this.vehicleRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  createVehicle(tenantId: string, dto: Record<string, unknown>) {
    const entity = this.vehicleRepo.create({ ...dto, tenantId } as Partial<AutoVehicle>);
    return this.vehicleRepo.save(entity);
  }

  async updateVehicle(tenantId: string, id: string, dto: Record<string, unknown>) {
    const entity = await this.vehicleRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Vehicle ${id} not found`);
    Object.assign(entity, dto);
    return this.vehicleRepo.save(entity);
  }

  async removeVehicle(tenantId: string, id: string) {
    const entity = await this.vehicleRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Vehicle ${id} not found`);
    return this.vehicleRepo.remove(entity);
  }

  // ── Service Orders ──────────────────────────────────────────────────────────

  findOrders(tenantId: string, status?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where['status'] = status as AutoServiceOrderStatus;

    return this.orderRepo.find({
      where: where as Parameters<typeof this.orderRepo.find>[0]['where'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderStats(tenantId: string) {
    const todayStr = new Date().toISOString().slice(0, 10);

    const [received, inProgress, ready, totalToday] = await Promise.all([
      this.orderRepo.count({ where: { tenantId, status: 'received' } }),
      this.orderRepo.count({ where: { tenantId, status: 'in_progress' } }),
      this.orderRepo.count({ where: { tenantId, status: 'ready' } }),
      this.orderRepo.createQueryBuilder('o')
        .where('o."tenantId" = :tenantId', { tenantId })
        .andWhere('o."receivedAt" = :today', { today: todayStr })
        .getCount(),
    ]);

    return { received, inProgress, ready, totalToday };
  }

  createOrder(tenantId: string, dto: Record<string, unknown>) {
    const workItems = (dto['workItems'] as WorkItem[] | undefined) ?? [];
    const totalCost = computeTotalCost(workItems);
    const entity = this.orderRepo.create({
      ...dto,
      tenantId,
      workItems,
      totalCost,
    } as Partial<AutoServiceOrder>);
    return this.orderRepo.save(entity);
  }

  async updateOrder(tenantId: string, id: string, dto: Record<string, unknown>) {
    const entity = await this.orderRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Service order ${id} not found`);
    Object.assign(entity, dto);
    // recompute totalCost if workItems were supplied
    if (dto['workItems']) {
      entity.totalCost = computeTotalCost(entity.workItems);
    }
    return this.orderRepo.save(entity);
  }

  async removeOrder(tenantId: string, id: string) {
    const entity = await this.orderRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Service order ${id} not found`);
    return this.orderRepo.remove(entity);
  }

  async advanceStatus(tenantId: string, id: string) {
    const entity = await this.orderRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Service order ${id} not found`);

    const idx = STATUS_SEQUENCE.indexOf(entity.status);
    if (idx === -1 || idx >= STATUS_SEQUENCE.length - 1) {
      throw new BadRequestException(
        `Cannot advance status from "${entity.status}" — already at final stage`,
      );
    }
    entity.status = STATUS_SEQUENCE[idx + 1];
    if (entity.status === 'delivered') {
      entity.completedAt = new Date().toISOString().slice(0, 10);
    }
    return this.orderRepo.save(entity);
  }
}
