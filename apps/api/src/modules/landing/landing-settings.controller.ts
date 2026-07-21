import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LandingSettingsService } from './landing-settings.service';

@Controller('landing-settings')
export class LandingSettingsController {
  constructor(private readonly svc: LandingSettingsService) {}

  @Get()
  getContent() {
    return this.svc.getContent();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @Put()
  upsertContent(@Body() body: { content: Record<string, unknown> }) {
    return this.svc.upsertContent(body.content);
  }
}
