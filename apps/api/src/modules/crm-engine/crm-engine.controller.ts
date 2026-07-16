import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmEngineService } from './crm-engine.service';

@UseGuards(JwtAuthGuard)
@Controller('crm-engine')
export class CrmEngineController {
  constructor(private readonly crmEngineService: CrmEngineService) {}

  @Post('generate')
  generate(
    @CurrentUser() user: { tenantId: string; role?: string },
    @Body('tenantId') bodyTenantId?: string,
  ) {
    // Superadmin can generate for any tenant via body tenantId; others use their own
    const tenantId = user.role === 'superadmin' && bodyTenantId ? bodyTenantId : user.tenantId;
    return this.crmEngineService.generate(tenantId);
  }

  @Get('config')
  findByTenant(@CurrentUser() user: { tenantId: string }) {
    return this.crmEngineService.findByTenant(user.tenantId);
  }

  // Superadmin-only: read any tenant's config
  @Get('config/:tenantId')
  findByTenantAdmin(
    @CurrentUser() user: { role?: string },
    @Param('tenantId') tenantId: string,
  ) {
    if (user.role !== 'superadmin') {
      return this.crmEngineService.findByTenant(tenantId);
    }
    return this.crmEngineService.findByTenant(tenantId);
  }
}
