import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('stats')
  getStats() {
    return this.auditService.getStats();
  }

  @Get()
  findAll(
    @Query('tenantId')   tenantId?:   string,
    @Query('action')     action?:     string,
    @Query('entity')     entity?:     string,
    @Query('actorEmail') actorEmail?: string,
    @Query('search')     search?:     string,
    @Query('from')       from?:       string,
    @Query('to')         to?:         string,
    @Query('page')       page?:       string,
    @Query('limit')      limit?:      string,
  ) {
    return this.auditService.findAll({
      tenantId, action, entity, actorEmail, search, from, to,
      page:  page  ? Number(page)  : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('export')
  async exportCsv(
    @Res() res: Response,
    @Query('tenantId')   tenantId?:   string,
    @Query('action')     action?:     string,
    @Query('entity')     entity?:     string,
    @Query('actorEmail') actorEmail?: string,
    @Query('from')       from?:       string,
    @Query('to')         to?:         string,
  ) {
    const { data } = await this.auditService.findAll({
      tenantId, action, entity, actorEmail, from, to, limit: 5000,
    });

    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const header = ['Sana', 'Harakatlar', "Ob'ekt", 'ID', 'Label', 'Email', 'Rol', 'IP', 'Tenant'].join(',');
    const rows = data.map((r) =>
      [
        r.createdAt, r.action, r.entity, r.entityId,
        r.entityLabel, r.actorEmail, r.actorRole, r.ipAddress, r.tenantName,
      ].map(esc).join(','),
    );
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-${Date.now()}.csv"`);
    res.send('﻿' + csv); // BOM for Excel UTF-8
  }
}
