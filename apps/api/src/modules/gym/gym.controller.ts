import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { GymService } from './gym.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('gym')
@UseGuards(JwtAuthGuard)
export class GymController {
  constructor(private readonly svc: GymService) {}

  private tid(req: Request & { user: { tenantId: string } }) {
    return req.user.tenantId;
  }

  // ── Plans ──────────────────────────────────────────────────────────────────

  @Get('plans')
  plans(@Request() req: Request & { user: { tenantId: string } }) {
    return this.svc.findPlans(this.tid(req));
  }

  @Post('plans')
  createPlan(@Request() req: Request & { user: { tenantId: string } }, @Body() dto: Record<string, unknown>) {
    return this.svc.createPlan(this.tid(req), dto);
  }

  @Put('plans/:id')
  updatePlan(@Request() req: Request & { user: { tenantId: string } }, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.svc.updatePlan(this.tid(req), id, dto);
  }

  @Delete('plans/:id')
  removePlan(@Request() req: Request & { user: { tenantId: string } }, @Param('id') id: string) {
    return this.svc.removePlan(this.tid(req), id);
  }

  // ── Members ────────────────────────────────────────────────────────────────

  @Get('members/stats')
  memberStats(@Request() req: Request & { user: { tenantId: string } }) {
    return this.svc.getMemberStats(this.tid(req));
  }

  @Get('members')
  members(
    @Request() req: Request & { user: { tenantId: string } },
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findMembers(this.tid(req), search, status);
  }

  @Post('members')
  createMember(@Request() req: Request & { user: { tenantId: string } }, @Body() dto: Record<string, unknown>) {
    return this.svc.createMember(this.tid(req), dto as Parameters<GymService['createMember']>[1]);
  }

  @Put('members/:id')
  updateMember(@Request() req: Request & { user: { tenantId: string } }, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.svc.updateMember(this.tid(req), id, dto as Parameters<GymService['updateMember']>[2]);
  }

  @Delete('members/:id')
  removeMember(@Request() req: Request & { user: { tenantId: string } }, @Param('id') id: string) {
    return this.svc.removeMember(this.tid(req), id);
  }

  @Post('members/sync-expired')
  syncExpired(@Request() req: Request & { user: { tenantId: string } }) {
    return this.svc.syncExpiredMembers(this.tid(req));
  }

  // ── Check-ins ──────────────────────────────────────────────────────────────

  @Get('checkins')
  checkins(
    @Request() req: Request & { user: { tenantId: string } },
    @Query('memberId') memberId?: string,
    @Query('date') date?: string,
  ) {
    return this.svc.findCheckins(this.tid(req), memberId, date);
  }

  @Post('checkins')
  checkIn(
    @Request() req: Request & { user: { tenantId: string } },
    @Body() body: { memberId: string; note?: string },
  ) {
    return this.svc.checkIn(this.tid(req), body.memberId, body.note);
  }
}
