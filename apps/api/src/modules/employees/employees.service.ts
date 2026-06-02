import {
  ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
  ) {}

  async create(tenantId: string, dto: CreateEmployeeDto) {
    if (!tenantId) throw new ForbiddenException('Tenant kerak');
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Bu email allaqachon band');
    const hashed = await bcrypt.hash(dto.password, 10);
    const emp = this.repo.create({ ...dto, password: hashed, tenantId });
    const saved = await this.repo.save(emp);
    return this.strip(saved);
  }

  async findAll(tenantId: string) {
    if (!tenantId) throw new ForbiddenException('Tenant kerak');
    const list = await this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return list.map(this.strip);
  }

  async findOne(tenantId: string, id: string) {
    const emp = await this.repo.findOne({ where: { id, tenantId } });
    if (!emp) throw new NotFoundException(`Xodim #${id} topilmadi`);
    return this.strip(emp);
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    const emp = await this.repo.findOne({ where: { id, tenantId } });
    if (!emp) throw new NotFoundException(`Xodim #${id} topilmadi`);
    if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);
    Object.assign(emp, dto);
    const saved = await this.repo.save(emp);
    return this.strip(saved);
  }

  async deactivate(tenantId: string, id: string): Promise<void> {
    const emp = await this.repo.findOne({ where: { id, tenantId } });
    if (!emp) throw new NotFoundException(`Xodim #${id} topilmadi`);
    await this.repo.update(id, { isActive: false, sessionToken: null });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const emp = await this.repo.findOne({ where: { id, tenantId } });
    if (!emp) throw new NotFoundException(`Xodim #${id} topilmadi`);
    await this.repo.delete(id);
  }

  private strip(emp: Employee) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, sessionToken, refreshToken, ...rest } = emp;
    return rest;
  }
}
