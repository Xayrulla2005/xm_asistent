import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface CreateAuditDto {
  tenantId?:    string | null;
  tenantName?:  string | null;
  action:       string;
  entity?:      string | null;
  entityId?:    string | null;
  entityLabel?: string | null;
  actorEmail?:  string | null;
  actorRole?:   string | null;
  ipAddress?:   string | null;
  before?:      Record<string, unknown> | null;
  after?:       Record<string, unknown> | null;
  meta?:        Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  /** Fire-and-forget: never blocks the main request */
  log(dto: CreateAuditDto): void {
    const record = this.repo.create({
      tenantId:    dto.tenantId    ?? null,
      tenantName:  dto.tenantName  ?? null,
      action:      dto.action,
      entity:      dto.entity      ?? null,
      entityId:    dto.entityId    ?? null,
      entityLabel: dto.entityLabel ?? null,
      actorEmail:  dto.actorEmail  ?? null,
      actorRole:   dto.actorRole   ?? null,
      ipAddress:   dto.ipAddress   ?? null,
      before:      dto.before      ?? null,
      after:       dto.after       ?? null,
      meta:        dto.meta        ?? null,
    });
    this.repo.save(record).catch((e: unknown) =>
      console.error('[Audit] log error:', e),
    );
  }

  async findAll(filters: {
    tenantId?:   string;
    action?:     string;
    entity?:     string;
    actorEmail?: string;
    search?:     string;
    from?:       string;
    to?:         string;
    page?:       number;
    limit?:      number;
  }) {
    const page  = filters.page  ?? 1;
    const limit = Math.min(filters.limit ?? 30, 100);
    const skip  = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy('a."createdAt"', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.tenantId)   qb.andWhere('a."tenantId" = :t',        { t: filters.tenantId });
    if (filters.action)     qb.andWhere('a.action = :ac',           { ac: filters.action });
    if (filters.entity)     qb.andWhere('a.entity = :en',           { en: filters.entity });
    if (filters.actorEmail) qb.andWhere('a."actorEmail" ILIKE :ae', { ae: `%${filters.actorEmail}%` });
    if (filters.from)       qb.andWhere('a."createdAt" >= :fr',     { fr: new Date(filters.from) });
    if (filters.to)         qb.andWhere('a."createdAt" <= :to',     { to: new Date(filters.to) });

    if (filters.search) {
      qb.andWhere(
        '(a."entityLabel" ILIKE :s OR a."entityId" ILIKE :s OR a."actorEmail" ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [total, today] = await Promise.all([
      this.repo.count(),
      this.repo
        .createQueryBuilder('a')
        .where('a."createdAt" >= :start', { start: todayStart })
        .getCount(),
    ]);

    const byAction = await this.repo
      .createQueryBuilder('a')
      .select('a.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.action')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ action: string; count: string }>();

    const byEntity = await this.repo
      .createQueryBuilder('a')
      .select('a.entity', 'entity')
      .addSelect('COUNT(*)', 'count')
      .where('a.entity IS NOT NULL')
      .groupBy('a.entity')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ entity: string; count: string }>();

    return {
      total,
      today,
      byAction: byAction.map((r) => ({ action: r.action, count: Number(r.count) })),
      byEntity: byEntity.map((r) => ({ entity: r.entity, count: Number(r.count) })),
    };
  }
}
