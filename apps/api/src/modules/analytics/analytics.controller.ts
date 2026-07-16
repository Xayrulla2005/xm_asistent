import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService, ActivityPeriod } from './analytics.service';

const VALID_PERIODS = new Set<ActivityPeriod>(['daily', 'weekly', 'monthly', 'yearly']);

function toPeriod(raw: string | undefined): ActivityPeriod {
  const p = (raw ?? 'weekly') as ActivityPeriod;
  return VALID_PERIODS.has(p) ? p : 'weekly';
}

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('activity')
  getActivity(@Query('period') period?: string) {
    return this.analyticsService.getActivity(toPeriod(period));
  }

  @Get('server')
  getServer() {
    return this.analyticsService.getServer();
  }

  @Get('tenants')
  getTenantStats() {
    return this.analyticsService.getTenantStats();
  }

  @Get('mrr-trend')
  getMrrTrend() {
    return this.analyticsService.getMrrTrend();
  }

  @Get('industry-breakdown')
  getIndustryBreakdown() {
    return this.analyticsService.getIndustryBreakdown();
  }
}
