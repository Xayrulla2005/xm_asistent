import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(
    @CurrentUser() user: any,
    @Headers('x-tenant-id') tenantHeader: string,
    @Query('date') date?: string,
  ) {
    const tenantId = user?.tenantId ?? tenantHeader;
    return this.dashboardService.getStats(tenantId, date);
  }
}
