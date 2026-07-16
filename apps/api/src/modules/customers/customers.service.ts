import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  create(dto: CreateCustomerDto): Promise<Customer> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(tenantId?: string): Promise<Customer[]> {
    const where = tenantId ? { tenantId } : {};
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Customer> {
    const customer = await this.repo.findOne({ where: { id, tenantId } });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, tenantId: string): Promise<Customer> {
    const customer = await this.findOne(id, tenantId);
    Object.assign(customer, dto);
    return this.repo.save(customer);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const customer = await this.findOne(id, tenantId);
    await this.repo.remove(customer);
  }

  async exportExcel(tenantId: string): Promise<{ buffer: Buffer; filename: string }> {
    const customers = await this.findAll(tenantId);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Mijozlar');

    ws.columns = [
      { header: '№',       key: 'seq',      width: 6  },
      { header: 'Ismi',    key: 'name',     width: 24 },
      { header: 'Telefon', key: 'phone',    width: 18 },
      { header: 'Manzil',  key: 'address',  width: 28 },
      { header: 'Qarz',    key: 'debt',     width: 16 },
      { header: 'Sana',    key: 'date',     width: 20 },
    ];

    ws.getRow(1).font      = { bold: true };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    customers.forEach((c, idx) => {
      ws.addRow({
        seq:     idx + 1,
        name:    c.name,
        phone:   c.phone || '—',
        address: c.address || '—',
        debt:    Number(c.totalDebt),
        date:    new Date(c.createdAt).toLocaleDateString('uz-UZ'),
      });
    });

    const buffer   = Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer);
    const today    = new Date().toISOString().slice(0, 10);
    const filename = `mijozlar_${today}.xlsx`;
    return { buffer, filename };
  }
}
