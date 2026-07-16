import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bug, BugPriority, BugStatus, BugType } from './bug.entity';
import { BugComment } from './entities/bug-comment.entity';
import { CreateBugDto } from './dto/create-bug.dto';
import { UpdateBugDto } from './dto/update-bug.dto';

const SLA_HOURS: Record<BugPriority, number | null> = {
  [BugPriority.P1]: 1,
  [BugPriority.P2]: 4,
  [BugPriority.P3]: 24,
  [BugPriority.P4]: null,
};

@Injectable()
export class BugsService {
  constructor(
    @InjectRepository(Bug)
    private readonly bugRepo: Repository<Bug>,
    @InjectRepository(BugComment)
    private readonly commentRepo: Repository<BugComment>,
  ) {}

  create(dto: CreateBugDto): Promise<Bug> {
    const priority = (dto.priority as BugPriority | undefined) ?? BugPriority.P3;
    const slaHours = SLA_HOURS[priority];
    const slaDeadline = slaHours
      ? new Date(Date.now() + slaHours * 60 * 60 * 1000)
      : null;

    const bug = this.bugRepo.create({
      tenantId:      dto.tenantId      ?? null,
      tenantName:    dto.tenantName    ?? null,
      type:          dto.type,
      message:       dto.message,
      stack:         dto.stack         ?? null,
      url:           dto.url           ?? null,
      userEmail:     dto.userEmail     ?? null,
      title:         dto.title         ?? null,
      description:   dto.description   ?? null,
      priority,
      source:        dto.source        ?? null,
      moduleAffected:dto.moduleAffected ?? null,
      userAgent:     dto.userAgent     ?? null,
      statusCode:    dto.statusCode    ?? null,
      method:        dto.method        ?? null,
      slaDeadline,
    });
    return this.bugRepo.save(bug);
  }

  findAll(filters: {
    status?:        BugStatus;
    tenantId?:      string;
    type?:          BugType;
    priority?:      BugPriority;
    moduleAffected?:string;
    from?:          string;
    to?:            string;
    page?:          number;
    limit?:         number;
  }): Promise<{ data: Bug[]; total: number; page: number; limit: number }> {
    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 50));

    const qb = this.bugRepo
      .createQueryBuilder('bug')
      .orderBy('bug.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status)         qb.andWhere('bug.status = :status',              { status:         filters.status });
    if (filters.tenantId)       qb.andWhere('bug."tenantId" = :tid',             { tid:            filters.tenantId });
    if (filters.type)           qb.andWhere('bug.type = :type',                  { type:           filters.type });
    if (filters.priority)       qb.andWhere('bug.priority = :priority',          { priority:       filters.priority });
    if (filters.moduleAffected) qb.andWhere('bug."moduleAffected" = :module',    { module:         filters.moduleAffected });
    if (filters.from)           qb.andWhere('bug."createdAt" >= :from',          { from:           new Date(filters.from) });
    if (filters.to)             qb.andWhere('bug."createdAt" <= :to',            { to:             new Date(filters.to) });

    return qb.getManyAndCount().then(([data, total]) => ({ data, total, page, limit }));
  }

  async findOne(id: string): Promise<Bug> {
    const bug = await this.bugRepo.findOne({ where: { id } });
    if (!bug) throw new NotFoundException('Bug topilmadi');
    return bug;
  }

  async update(id: string, dto: UpdateBugDto): Promise<Bug> {
    const bug = await this.findOne(id);

    if (dto.status !== undefined) {
      const prev = bug.status;
      bug.status = dto.status;

      if (
        (dto.status === BugStatus.RESOLVED || dto.status === BugStatus.CLOSED) &&
        !bug.resolvedAt
      ) {
        bug.resolvedAt = new Date();
      }
      if (dto.status === BugStatus.REOPENED && prev === BugStatus.CLOSED) {
        bug.resolvedAt = null;
      }
    }

    if (dto.assignedTo    !== undefined) bug.assignedTo    = dto.assignedTo;
    if (dto.priority      !== undefined) bug.priority      = dto.priority as BugPriority;
    if (dto.resolutionNote !== undefined) bug.resolutionNote = dto.resolutionNote;

    return this.bugRepo.save(bug);
  }

  async addComment(bugId: string, body: string, authorEmail: string): Promise<BugComment> {
    await this.findOne(bugId);
    const comment = this.commentRepo.create({ bugId, body, authorEmail });
    return this.commentRepo.save(comment);
  }

  async getComments(bugId: string): Promise<BugComment[]> {
    return this.commentRepo.find({
      where: { bugId },
      order: { createdAt: 'ASC' },
    });
  }

  async getStats() {
    const now = new Date();

    const [total, newCount, inProgress, resolved, slaBreached, resolvedToday] = await Promise.all([
      this.bugRepo.count(),
      this.bugRepo.count({ where: { status: BugStatus.NEW } }),
      this.bugRepo.count({ where: { status: BugStatus.IN_PROGRESS } }),
      this.bugRepo.count({ where: { status: BugStatus.RESOLVED } }),
      this.bugRepo
        .createQueryBuilder('bug')
        .where('bug."slaDeadline" < :now', { now })
        .andWhere('bug.status NOT IN (:...closed)', { closed: [BugStatus.RESOLVED, BugStatus.CLOSED] })
        .getCount(),
      this.bugRepo
        .createQueryBuilder('bug')
        .where('bug."resolvedAt" >= :today', { today: new Date(now.toISOString().split('T')[0]) })
        .getCount(),
    ]);

    const p1p2 = await this.bugRepo
      .createQueryBuilder('bug')
      .where('bug.priority IN (:...prio)', { prio: [BugPriority.P1, BugPriority.P2] })
      .andWhere('bug.status NOT IN (:...closed)', { closed: [BugStatus.RESOLVED, BugStatus.CLOSED] })
      .getCount();

    const byTenantRaw = await this.bugRepo
      .createQueryBuilder('bug')
      .select('bug."tenantId"',    'tenantId')
      .addSelect('bug."tenantName"', 'tenantName')
      .addSelect('COUNT(*)',         'count')
      .where('bug."tenantId" IS NOT NULL')
      .groupBy('bug."tenantId"')
      .addGroupBy('bug."tenantName"')
      .orderBy('count', 'DESC')
      .getRawMany<{ tenantId: string; tenantName: string | null; count: string }>();

    return {
      total,
      new:          newCount,
      in_progress:  inProgress,
      resolved,
      p1p2Open:     p1p2,
      slaBreached,
      resolvedToday,
      byTenant: byTenantRaw.map((r) => ({
        tenantId:   r.tenantId,
        tenantName: r.tenantName,
        count:      Number(r.count),
      })),
    };
  }

  /** Called by AllExceptionsFilter — must never throw */
  async createFromException(data: {
    tenantId?:  string;
    userEmail?: string;
    method:     string;
    url:        string;
    statusCode: number;
    error:      string;
    stack?:     string;
  }): Promise<void> {
    try {
      const bug = this.bugRepo.create({
        tenantId:   data.tenantId  ?? null,
        type:       BugType.API_ERROR,
        source:     'backend',
        message:    `[${data.method} ${data.url}] ${data.error}`,
        title:      `API Error ${data.statusCode}: ${data.method} ${data.url}`,
        stack:      data.stack    ?? null,
        url:        data.url,
        method:     data.method,
        statusCode: data.statusCode,
        userEmail:  data.userEmail ?? null,
        priority:   BugPriority.P2,
        slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
      });
      await this.bugRepo.save(bug);
    } catch {
      // must not throw — log silently
    }
  }
}
