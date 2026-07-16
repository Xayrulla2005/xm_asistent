import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
}
