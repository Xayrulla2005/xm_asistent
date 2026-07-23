import {
  Body, Controller, ForbiddenException, Get, Param, Post, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BillingService } from './billing.service';
import { ChangePlanDto, RecordPaymentDto } from './dto/billing.dto';

type JwtUser = { tenantId: string; role?: string };

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ── Admin-only: aggregate views ────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  getAll() {
    return this.billingService.getAll();
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  getStats() {
    return this.billingService.getStats();
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  getPendingRequests() {
    return this.billingService.getPendingRequests();
  }

  // ── Tenant self-service: own subscription data ─────────────────────────────

  @Get(':tenantId')
  getOrCreate(
    @CurrentUser() user: JwtUser,
    @Param('tenantId') tenantId: string,
  ) {
    this.assertAccess(user, tenantId);
    return this.billingService.getOrCreate(tenantId);
  }

  @Get(':tenantId/history')
  getPaymentHistory(
    @CurrentUser() user: JwtUser,
    @Param('tenantId') tenantId: string,
  ) {
    this.assertAccess(user, tenantId);
    return this.billingService.getPaymentHistory(tenantId);
  }

  @Get(':tenantId/limits')
  checkUsageLimits(
    @CurrentUser() user: JwtUser,
    @Param('tenantId') tenantId: string,
  ) {
    this.assertAccess(user, tenantId);
    return this.billingService.checkUsageLimits(tenantId);
  }

  @Get(':tenantId/features')
  getFeatureFlags(
    @CurrentUser() user: JwtUser,
    @Param('tenantId') tenantId: string,
  ) {
    this.assertAccess(user, tenantId);
    return this.billingService.getFeatureFlags(tenantId);
  }

  @Post(':tenantId/request-plan')
  requestPlanChange(
    @CurrentUser() user: JwtUser,
    @Param('tenantId') tenantId: string,
    @Body() dto: ChangePlanDto,
  ) {
    this.assertAccess(user, tenantId);
    return this.billingService.requestPlanChange(tenantId, dto.plan, dto.cycle);
  }

  // Tenant cancels their own pending request; superadmin rejects a tenant's request
  @Post(':tenantId/reject')
  rejectPlanChange(
    @CurrentUser() user: JwtUser,
    @Param('tenantId') tenantId: string,
  ) {
    this.assertAccess(user, tenantId);
    return this.billingService.rejectPlanChange(tenantId);
  }

  // ── Admin-only: plan management ────────────────────────────────────────────

  @Post(':tenantId/plan')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  changePlan(
    @Param('tenantId') tenantId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.billingService.changePlan(tenantId, dto);
  }

  @Post(':tenantId/payment')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  recordPayment(
    @Param('tenantId') tenantId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.billingService.recordPayment(tenantId, dto);
  }

  @Post(':tenantId/suspend')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  suspendTenant(@Param('tenantId') tenantId: string) {
    return this.billingService.suspendTenant(tenantId);
  }

  @Post(':tenantId/reactivate')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  reactivateTenant(@Param('tenantId') tenantId: string) {
    return this.billingService.reactivateTenant(tenantId);
  }

  @Post(':tenantId/freeze')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  freezeTenant(
    @Param('tenantId') tenantId: string,
    @Body('days') days: number,
  ) {
    return this.billingService.freezeTenant(tenantId, days ?? 30);
  }

  @Post(':tenantId/unfreeze')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  unfreezeTenant(@Param('tenantId') tenantId: string) {
    return this.billingService.unfreezeTenant(tenantId);
  }

  @Post(':tenantId/approve')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  approvePlanChange(@Param('tenantId') tenantId: string) {
    return this.billingService.approvePlanChange(tenantId);
  }

  // ── Payment gateway checkout links ────────────────────────────────────────
  //
  // Returns a redirect URL for the chosen payment provider.
  // Frontend opens this URL in a new tab; provider redirects back on success.

  @Post(':tenantId/checkout-link')
  createCheckoutLink(
    @CurrentUser() user: JwtUser,
    @Param('tenantId') tenantId: string,
    @Body() body: {
      method: 'payme' | 'click';
      plan:   string;
      cycle:  string;
      amount: number; // UZS
    },
  ) {
    this.assertAccess(user, tenantId);
    return this.billingService.createCheckoutLink(tenantId, body);
  }

  // ── Guard helper ───────────────────────────────────────────────────────────

  private assertAccess(user: JwtUser, tenantId: string): void {
    if (user.role !== 'superadmin' && user.tenantId !== tenantId) {
      throw new ForbiddenException('Kirish taqiqlangan');
    }
  }
}
