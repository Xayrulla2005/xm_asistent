import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientPortalService } from './client-portal.service';

@Controller('portal/admin')
@UseGuards(JwtAuthGuard)
export class ClientPortalAdminController {
  constructor(private readonly service: ClientPortalService) {}

  // ── Customer portal access ──────────────────────────────────────────────────

  @Post('customers/:id/access')
  setPortalAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { password: string; enabled?: boolean },
  ) {
    return this.service.setPortalAccess(id, body.password, body.enabled ?? true);
  }

  @Delete('customers/:id/access')
  @HttpCode(HttpStatus.NO_CONTENT)
  disablePortalAccess(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.disablePortalAccess(id);
  }

  // ── Promotions ──────────────────────────────────────────────────────────────

  @Get(':tenantId/promotions')
  getPromotions(@Param('tenantId') tenantId: string) {
    return this.service.getPromotions(tenantId);
  }

  @Post(':tenantId/promotions')
  createPromotion(
    @Param('tenantId') tenantId: string,
    @Body() body: { title: string; description?: string; validUntil?: string },
  ) {
    return this.service.createPromotion(tenantId, body);
  }

  @Patch('promotions/:id')
  updatePromotion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<{ title: string; description: string; isActive: boolean; validUntil: string }>,
  ) {
    return this.service.updatePromotion(id, body);
  }

  @Delete('promotions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePromotion(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deletePromotion(id);
  }

  // ── Announcements ───────────────────────────────────────────────────────────

  @Get(':tenantId/announcements')
  getAnnouncements(@Param('tenantId') tenantId: string) {
    return this.service.getAnnouncements(tenantId);
  }

  @Post(':tenantId/announcements')
  createAnnouncement(
    @Param('tenantId') tenantId: string,
    @Body() body: { title: string; body?: string },
  ) {
    return this.service.createAnnouncement(tenantId, body);
  }

  @Patch('announcements/:id')
  updateAnnouncement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<{ title: string; body: string; isActive: boolean }>,
  ) {
    return this.service.updateAnnouncement(id, body);
  }

  @Delete('announcements/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAnnouncement(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteAnnouncement(id);
  }
}
