import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Debt, DebtStatus } from './entities/debt.entity';
import { Customer } from '../customers/entities/customer.entity';

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt)
    private readonly repo: Repository<Debt>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async create(data: {
    tenantId: string;
    saleId: string;
    customerId: string | null;
    customerName: string;
    amount: number;
  }): Promise<Debt> {
    const debt = this.repo.create({
      tenantId:        data.tenantId,
      saleId:          data.saleId,
      customerId:      data.customerId,
      customerName:    data.customerName,
      originalAmount:  data.amount,
      remainingAmount: data.amount,
      status:          DebtStatus.PENDING,
    });
    return this.repo.save(debt);
  }

  findAll(tenantId: string, customerId?: string, status?: string): Promise<Debt[]> {
    const where: Record<string, unknown> = { tenantId };
    if (customerId) where['customerId'] = customerId;
    if (status && Object.values(DebtStatus).includes(status as DebtStatus)) {
      where['status'] = status as DebtStatus;
    }
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  findBySale(saleId: string, tenantId?: string): Promise<Debt | null> {
    const where: Record<string, unknown> = { saleId };
    if (tenantId) where['tenantId'] = tenantId;
    return this.repo.findOne({ where });
  }

  async recordPayment(id: string, amount: number, tenantId: string, notes?: string): Promise<Debt> {
    const debt = await this.repo.findOne({ where: { id, tenantId } });
    if (!debt) throw new NotFoundException(`Qarz #${id} topilmadi`);
    if (debt.status === DebtStatus.PAID)
      throw new BadRequestException('Qarz allaqachon to\'langan');
    if (debt.status === DebtStatus.CANCELLED)
      throw new BadRequestException('Qarz bekor qilingan');
    if (amount <= 0)
      throw new BadRequestException('To\'lov miqdori 0 dan katta bo\'lishi kerak');
    if (amount > Number(debt.remainingAmount))
      throw new BadRequestException('To\'lov miqdori qarzdan oshib ketdi');

    const newRemaining  = Number(debt.remainingAmount) - amount;
    debt.remainingAmount = newRemaining;
    debt.status          = newRemaining <= 0 ? DebtStatus.PAID : DebtStatus.PARTIAL;
    if (notes) debt.notes = notes;

    if (debt.customerId) {
      await this.customerRepo.decrement(
        { id: debt.customerId },
        'totalDebt',
        amount,
      );
    }

    return this.repo.save(debt);
  }

  async cancel(id: string, tenantId: string): Promise<Debt> {
    const debt = await this.repo.findOne({ where: { id, tenantId } });
    if (!debt) throw new NotFoundException(`Qarz #${id} topilmadi`);
    if (debt.status === DebtStatus.PAID)
      throw new BadRequestException('To\'langan qarzni bekor qilib bo\'lmaydi');

    const restored = Number(debt.remainingAmount);
    debt.status = DebtStatus.CANCELLED;

    if (debt.customerId && restored > 0) {
      await this.customerRepo.decrement(
        { id: debt.customerId },
        'totalDebt',
        restored,
      );
    }

    return this.repo.save(debt);
  }

  async getSummary(tenantId: string) {
    const debts = await this.repo.find({
      where: { tenantId, status: In([DebtStatus.PENDING, DebtStatus.PARTIAL]) },
    });
    const totalDebt    = debts.reduce((s, d) => s + Number(d.remainingAmount), 0);
    const pendingCount = debts.length;
    return { totalDebt, pendingCount };
  }
}
