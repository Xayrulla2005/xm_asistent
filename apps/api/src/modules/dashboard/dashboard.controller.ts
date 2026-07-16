import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(
    @CurrentUser() user: { tenantId: string },
    @Query('date') date?: string,
  ) {
    return this.dashboardService.getStats(user.tenantId, date);
  }

  @Get('industry-stats')
  getIndustryStats(
    @CurrentUser() user: { tenantId: string },
    @Query('industry') industry: string,
  ) {
    const tenantId = user.tenantId;
    switch (industry) {
      case 'restaurant': return this.dashboardService.getRestaurantStats(tenantId);
      case 'clinic':     return this.dashboardService.getClinicStats(tenantId);
      case 'education':  return this.dashboardService.getEducationStats(tenantId);
      case 'fitness':
      case 'gym':        return this.dashboardService.getGymStats(tenantId);
      case 'beauty':
      case 'salon':      return this.dashboardService.getBeautyStats(tenantId);
      case 'auto':
      case 'autoservis': return this.dashboardService.getAutoStats(tenantId);
      default:           return this.dashboardService.getStats(tenantId);
    }
  }
}
