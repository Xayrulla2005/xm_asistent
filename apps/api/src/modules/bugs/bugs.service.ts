import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bug, BugStatus, BugType } from './bug.entity';
import { CreateBugDto } from './dto/create-bug.dto';
import { UpdateBugDto } from './dto/update-bug.dto';

@Injectable()
export class BugsService {
  constructor(
    @InjectRepository(Bug)
    private readonly bugRepo: Repository<Bug>,
  ) {}

  create(dto: CreateBugDto): Promise<Bug> {
    const bug = this.bugRepo.create({
      tenantId:   dto.tenantId   ?? null,
      tenantName: dto.tenantName ?? null,
      type:       dto.type,
      message:    dto.message,
      stack:      dto.stack      ?? null,
      url:        dto.url        ?? null,
      userEmail:  dto.userEmail  ?? null,
    });
    return this.bugRepo.save(bug);
  }

  findAll(filters: { status?: BugStatus; tenantId?: string; type?: BugType }): Promise<Bug[]> {
    const qb = this.bugRepo
      .createQueryBuilder('bug')
      .orderBy('bug.createdAt', 'DESC');

    if (filters.status)   qb.andWhere('bug.status = :status',     { status:   filters.status   });
    if (filters.tenantId) qb.andWhere('bug."tenantId" = :tid',    { tid:      filters.tenantId });
    if (filters.type)     qb.andWhere('bug.type = :type',         { type:     filters.type     });

    return qb.getMany();
  }

  async findOne(id: string): Promise<Bug> {
    const bug = await this.bugRepo.findOne({ where: { id } });
    if (!bug) throw new NotFoundException('Bug topilmadi');
    return bug;
  }

  async update(id: string, dto: UpdateBugDto): Promise<Bug> {
    const bug = await this.findOne(id);
    if (dto.status !== undefined)     bug.status     = dto.status;
    if (dto.assignedTo !== undefined) bug.assignedTo = dto.assignedTo;
    if (dto.status === BugStatus.RESOLVED && !bug.resolvedAt) {
      bug.resolvedAt = new Date();
    }
    return this.bugRepo.save(bug);
  }

  async getStats() {
    const [total, newCount, inProgress, resolved] = await Promise.all([
      this.bugRepo.count(),
      this.bugRepo.count({ where: { status: BugStatus.NEW } }),
      this.bugRepo.count({ where: { status: BugStatus.IN_PROGRESS } }),
      this.bugRepo.count({ where: { status: BugStatus.RESOLVED } }),
    ]);

    const byTenantRaw = await this.bugRepo
      .createQueryBuilder('bug')
      .select('bug."tenantId"',   'tenantId')
      .addSelect('bug."tenantName"', 'tenantName')
      .addSelect('COUNT(*)',         'count')
      .where('bug."tenantId" IS NOT NULL')
      .groupBy('bug."tenantId"')
      .addGroupBy('bug."tenantName"')
      .orderBy('count', 'DESC')
      .getRawMany<{ tenantId: string; tenantName: string | null; count: string }>();

    return {
      total,
      new:         newCount,
      in_progress: inProgress,
      resolved,
      byTenant: byTenantRaw.map((r) => ({
        tenantId:   r.tenantId,
        tenantName: r.tenantName,
        count:      Number(r.count),
      })),
    };
  }
}
