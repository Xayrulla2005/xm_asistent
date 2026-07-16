import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientPortalService } from './client-portal.service';

@Controller('portal/admin')
@UseGuards(JwtAuthGuard)
export class ClientPortalAdminController {
  constructor(private readonly service: ClientPortalService) {}

  // ── Customer portal access ──────────────────────────────────────────────────

  @Post('customers/:id/access')
  setPortalAccess(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { password: string; enabled?: boolean },
  ) {
    return this.service.setPortalAccess(id, user.tenantId, body.password, body.enabled ?? true);
  }

  @Delete('customers/:id/access')
  @HttpCode(HttpStatus.NO_CONTENT)
  disablePortalAccess(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.disablePortalAccess(id, user.tenantId);
  }

  // ── Promotions ──────────────────────────────────────────────────────────────

  @Get(':tenantId/promotions')
  getPromotions(
    @CurrentUser() user: { tenantId: string; role?: string },
    @Param('tenantId') tenantId: string,
  ) {
    if (user.role !== 'superadmin' && user.tenantId !== tenantId) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
    return this.service.getPromotions(tenantId);
  }

  @Post(':tenantId/promotions')
  createPromotion(
    @CurrentUser() user: { tenantId: string; role?: string },
    @Param('tenantId') tenantId: string,
    @Body() body: { title: string; description?: string; validUntil?: string },
  ) {
    if (user.role !== 'superadmin' && user.tenantId !== tenantId) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
    return this.service.createPromotion(tenantId, body);
  }

  @Patch('promotions/:id')
  updatePromotion(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<{ title: string; description: string; isActive: boolean; validUntil: string }>,
  ) {
    return this.service.updatePromotion(id, user.tenantId, body);
  }

  @Delete('promotions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePromotion(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deletePromotion(id, user.tenantId);
  }

  // ── Announcements ───────────────────────────────────────────────────────────

  @Get(':tenantId/announcements')
  getAnnouncements(
    @CurrentUser() user: { tenantId: string; role?: string },
    @Param('tenantId') tenantId: string,
  ) {
    if (user.role !== 'superadmin' && user.tenantId !== tenantId) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
    return this.service.getAnnouncements(tenantId);
  }

  @Post(':tenantId/announcements')
  createAnnouncement(
    @CurrentUser() user: { tenantId: string; role?: string },
    @Param('tenantId') tenantId: string,
    @Body() body: { title: string; body?: string },
  ) {
    if (user.role !== 'superadmin' && user.tenantId !== tenantId) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
    return this.service.createAnnouncement(tenantId, body);
  }

  @Patch('announcements/:id')
  updateAnnouncement(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<{ title: string; body: string; isActive: boolean }>,
  ) {
    return this.service.updateAnnouncement(id, user.tenantId, body);
  }

  @Delete('announcements/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAnnouncement(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteAnnouncement(id, user.tenantId);
  }
}
