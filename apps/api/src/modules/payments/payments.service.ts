import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  create(dto: CreatePaymentDto): Promise<Payment> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(tenantId?: string, status?: PaymentStatus, method?: PaymentMethod): Promise<Payment[]> {
    const qb = this.repo.createQueryBuilder('p').orderBy('p.createdAt', 'DESC');

    if (tenantId) qb.andWhere('p.tenantId = :tenantId', { tenantId });
    if (status)   qb.andWhere('p.status = :status', { status });
    if (method)   qb.andWhere('p.method = :method', { method });

    return qb.getMany();
  }

  async getStats(tenantId?: string): Promise<{
    totalIncome: number;
    totalExpense: number;
    pendingCount: number;
  }> {
    const qb = this.repo.createQueryBuilder('p');
    if (tenantId) qb.where('p.tenantId = :tenantId', { tenantId });

    const payments = await qb.getMany();

    const completed = payments.filter((p) => p.status === PaymentStatus.COMPLETED);
    const totalIncome  = completed
      .filter((p) => p.type === PaymentType.INCOME)
      .reduce((s, p) => s + Number(p.amount), 0);
    const totalExpense = completed
      .filter((p) => p.type === PaymentType.EXPENSE)
      .reduce((s, p) => s + Number(p.amount), 0);
    const pendingCount = payments.filter((p) => p.status === PaymentStatus.PENDING).length;

    return { totalIncome, totalExpense, pendingCount };
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.repo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException("To'lov topilmadi");
    return payment;
  }

  async updateStatus(id: string, dto: UpdatePaymentStatusDto): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.status = dto.status;
    return this.repo.save(payment);
  }
}
