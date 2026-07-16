import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
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
    const tenantId = user.role === 'superadmin' && bodyTenantId ? bodyTenantId : user.tenantId;
    return this.crmEngineService.generate(tenantId);
  }

  @Get('config')
  findByTenant(@CurrentUser() user: { tenantId: string }) {
    return this.crmEngineService.findByTenant(user.tenantId);
  }

  @Get('config/:tenantId')
  findByTenantAdmin(
    @CurrentUser() user: { role?: string; tenantId?: string },
    @Param('tenantId') tenantId: string,
  ) {
    if (user.role !== 'superadmin' && user.tenantId !== tenantId) {
      throw new ForbiddenException('Bu tenant konfiguratsiyasiga ruxsat yo\'q');
    }
    return this.crmEngineService.findByTenant(tenantId);
  }
}
