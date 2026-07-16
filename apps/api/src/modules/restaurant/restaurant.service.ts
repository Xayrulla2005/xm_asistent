import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { RestTable } from './entities/table.entity';
import { RestOrder } from './entities/order.entity';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(MenuItem)  private menuRepo:  Repository<MenuItem>,
    @InjectRepository(RestTable) private tableRepo: Repository<RestTable>,
    @InjectRepository(RestOrder) private orderRepo: Repository<RestOrder>,
  ) {}

  // Menu
  findMenu(tenantId: string, search?: string, category?: string) {
    if (search) {
      return this.menuRepo.find({
        where: [
          { tenantId, name: ILike(`%${search}%`) },
          { tenantId, category: ILike(`%${search}%`) },
        ],
        order: { category: 'ASC', name: 'ASC' },
      });
    }
    const where: Record<string, unknown> = { tenantId };
    if (category) where['category'] = category;
    return this.menuRepo.find({ where, order: { category: 'ASC', name: 'ASC' } });
  }

  async findMenuItemById(tenantId: string, id: string) {
    const m = await this.menuRepo.findOne({ where: { id, tenantId } });
    if (!m) throw new NotFoundException("Menyu elementi topilmadi");
    return m;
  }

  createMenuItem(tenantId: string, dto: Partial<MenuItem>) {
    return this.menuRepo.save(this.menuRepo.create({ ...dto, tenantId }));
  }

  async updateMenuItem(tenantId: string, id: string, dto: Partial<MenuItem>) {
    await this.findMenuItemById(tenantId, id);
    await this.menuRepo.update({ id, tenantId }, dto);
    return this.findMenuItemById(tenantId, id);
  }

  async removeMenuItem(tenantId: string, id: string) {
    await this.findMenuItemById(tenantId, id);
    await this.menuRepo.delete({ id, tenantId });
    return { success: true };
  }

  // Tables
  findTables(tenantId: string) {
    return this.tableRepo.find({ where: { tenantId }, order: { number: 'ASC' } });
  }

  async findTableById(tenantId: string, id: string) {
    const t = await this.tableRepo.findOne({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Stol topilmadi');
    return t;
  }

  createTable(tenantId: string, dto: Partial<RestTable>) {
    return this.tableRepo.save(this.tableRepo.create({ ...dto, tenantId }));
  }

  async updateTable(tenantId: string, id: string, dto: Partial<RestTable>) {
    await this.findTableById(tenantId, id);
    await this.tableRepo.update({ id, tenantId }, dto);
    return this.findTableById(tenantId, id);
  }

  async removeTable(tenantId: string, id: string) {
    await this.findTableById(tenantId, id);
    await this.tableRepo.delete({ id, tenantId });
    return { success: true };
  }

  // Orders
  findOrders(tenantId: string, status?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where['status'] = status;
    return this.orderRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }

  findKitchenOrders(tenantId: string) {
    return this.orderRepo.find({
      where: [
        { tenantId, status: 'pending'  },
        { tenantId, status: 'cooking'  },
        { tenantId, status: 'ready'    },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async findOrderById(tenantId: string, id: string) {
    const o = await this.orderRepo.findOne({ where: { id, tenantId } });
    if (!o) throw new NotFoundException('Buyurtma topilmadi');
    return o;
  }

  async createOrder(tenantId: string, dto: Partial<RestOrder>) {
    const total = ((dto.items ?? []) as { price: number; qty: number }[])
      .reduce((s, i) => s + i.price * i.qty, 0);
    const order = this.orderRepo.create({ ...dto, tenantId, total });
    const saved = await this.orderRepo.save(order);
    if (dto.tableId) {
      await this.tableRepo.update({ id: dto.tableId, tenantId }, { status: 'occupied', currentOrderId: saved.id });
    }
    return saved;
  }

  async updateOrder(tenantId: string, id: string, dto: Partial<RestOrder>) {
    const order = await this.findOrderById(tenantId, id);
    if (dto.items) {
      dto.total = (dto.items as { price: number; qty: number }[]).reduce((s, i) => s + i.price * i.qty, 0);
    }
    await this.orderRepo.update({ id, tenantId }, dto);
    if (dto.status === 'paid' && order.tableId) {
      await this.tableRepo.update({ id: order.tableId, tenantId }, { status: 'free', currentOrderId: null });
    }
    return this.findOrderById(tenantId, id);
  }

  async removeOrder(tenantId: string, id: string) {
    const order = await this.findOrderById(tenantId, id);
    await this.orderRepo.delete({ id, tenantId });
    if (order.tableId) {
      await this.tableRepo.update({ id: order.tableId, tenantId }, { status: 'free', currentOrderId: null });
    }
    return { success: true };
  }

  async getOrderStats(tenantId: string) {
    const now       = new Date();
    const dayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const dayEnd    = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const [total, pending, cooking, todayOrders] = await Promise.all([
      this.orderRepo.count({ where: { tenantId } }),
      this.orderRepo.count({ where: { tenantId, status: 'pending' } }),
      this.orderRepo.count({ where: { tenantId, status: 'cooking' } }),
      this.orderRepo.count({ where: { tenantId, createdAt: Between(dayStart, dayEnd) } }),
    ]);
    return { total, pending, cooking, today: todayOrders };
  }
}
