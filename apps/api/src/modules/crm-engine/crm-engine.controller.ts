import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmEngineService } from './crm-engine.service';

@UseGuards(JwtAuthGuard)
@Controller('crm-engine')
export class CrmEngineController {
  constructor(private readonly crmEngineService: CrmEngineService) {}

  @Post('generate')
  generate(@Body('tenantId') tenantId: string) {
    return this.crmEngineService.generate(tenantId);
  }

  @Get(':tenantId')
  findByTenant(@Param('tenantId') tenantId: string) {
    return this.crmEngineService.findByTenant(tenantId);
  }
}
