import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BeautyCatalog } from './entities/beauty-catalog.entity';
import { BeautyMaster } from './entities/beauty-master.entity';
import { BeautyAppointment, BeautyAppointmentStatus } from './entities/beauty-appointment.entity';

@Injectable()
export class BeautyService {
  constructor(
    @InjectRepository(BeautyCatalog)    private readonly catalogRepo:      Repository<BeautyCatalog>,
    @InjectRepository(BeautyMaster)     private readonly masterRepo:       Repository<BeautyMaster>,
    @InjectRepository(BeautyAppointment) private readonly appointmentRepo: Repository<BeautyAppointment>,
  ) {}

  // ── Services (catalog) ──────────────────────────────────────────────────────

  findServices(tenantId: string) {
    return this.catalogRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  createService(tenantId: string, dto: Record<string, unknown>) {
    const entity = this.catalogRepo.create({ ...dto, tenantId } as Partial<BeautyCatalog>);
    return this.catalogRepo.save(entity);
  }

  async updateService(tenantId: string, id: string, dto: Record<string, unknown>) {
    const entity = await this.catalogRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Beauty service ${id} not found`);
    Object.assign(entity, dto);
    return this.catalogRepo.save(entity);
  }

  async removeService(tenantId: string, id: string) {
    const entity = await this.catalogRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Beauty service ${id} not found`);
    return this.catalogRepo.remove(entity);
  }

  // ── Masters ─────────────────────────────────────────────────────────────────

  findMasters(tenantId: string) {
    return this.masterRepo.find({
      where: { tenantId },
      order: { firstName: 'ASC' },
    });
  }

  createMaster(tenantId: string, dto: Record<string, unknown>) {
    const entity = this.masterRepo.create({ ...dto, tenantId } as Partial<BeautyMaster>);
    return this.masterRepo.save(entity);
  }

  async updateMaster(tenantId: string, id: string, dto: Record<string, unknown>) {
    const entity = await this.masterRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Beauty master ${id} not found`);
    Object.assign(entity, dto);
    return this.masterRepo.save(entity);
  }

  async removeMaster(tenantId: string, id: string) {
    const entity = await this.masterRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Beauty master ${id} not found`);
    entity.isActive = false;
    return this.masterRepo.save(entity);
  }

  // ── Appointments ─────────────────────────────────────────────────────────────

  findAppointments(
    tenantId: string,
    date?: string,
    masterId?: string,
    status?: string,
  ) {
    const where: Record<string, unknown> = { tenantId };
    if (date)     where['date']     = date;
    if (masterId) where['masterId'] = masterId;
    if (status)   where['status']   = status as BeautyAppointmentStatus;

    return this.appointmentRepo.find({
      where: where as Parameters<typeof this.appointmentRepo.find>[0]['where'],
      order: { date: 'ASC', timeSlot: 'ASC' },
    });
  }

  async getAppointmentStats(tenantId: string) {
    const todayStr = new Date().toISOString().slice(0, 10);

    const todayList = await this.appointmentRepo.find({
      where: { tenantId, date: todayStr },
    });

    const scheduled       = todayList.filter(a => a.status === 'scheduled').length;
    const completedToday  = todayList.filter(a => a.status === 'completed');
    const todayFee        = completedToday.reduce((s, a) => s + Number(a.fee), 0);

    return {
      todayCount:          todayList.length,
      scheduled,
      completedTodayCount: completedToday.length,
      todayFee,
    };
  }

  async createAppointment(tenantId: string, dto: Record<string, unknown>) {
    // If serviceId provided, copy price to fee automatically
    let fee = dto['fee'] as number | undefined;
    if (!fee && dto['serviceId']) {
      const svc = await this.catalogRepo.findOne({ where: { id: dto['serviceId'] as string, tenantId } });
      if (svc) fee = Number(svc.price);
    }
    const entity = this.appointmentRepo.create({
      ...dto,
      tenantId,
      ...(fee !== undefined ? { fee } : {}),
    } as Partial<BeautyAppointment>);
    return this.appointmentRepo.save(entity);
  }

  async updateAppointment(tenantId: string, id: string, dto: Record<string, unknown>) {
    const entity = await this.appointmentRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Beauty appointment ${id} not found`);
    Object.assign(entity, dto);
    return this.appointmentRepo.save(entity);
  }

  async removeAppointment(tenantId: string, id: string) {
    const entity = await this.appointmentRepo.findOne({ where: { id, tenantId } });
    if (!entity) throw new NotFoundException(`Beauty appointment ${id} not found`);
    return this.appointmentRepo.remove(entity);
  }
}
