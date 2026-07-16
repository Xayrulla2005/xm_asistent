import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BeautyService } from './beauty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthRequest = Request & { user: { tenantId: string } };

@Controller('beauty')
@UseGuards(JwtAuthGuard)
export class BeautyController {
  constructor(private readonly svc: BeautyService) {}

  private tid(req: AuthRequest): string {
    return req.user.tenantId;
  }

  // ── Services (catalog) ──────────────────────────────────────────────────────

  @Get('services')
  findServices(@Request() req: AuthRequest) {
    return this.svc.findServices(this.tid(req));
  }

  @Post('services')
  createService(@Request() req: AuthRequest, @Body() dto: Record<string, unknown>) {
    return this.svc.createService(this.tid(req), dto);
  }

  @Put('services/:id')
  updateService(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.svc.updateService(this.tid(req), id, dto);
  }

  @Delete('services/:id')
  removeService(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.removeService(this.tid(req), id);
  }

  // ── Masters ─────────────────────────────────────────────────────────────────

  @Get('masters')
  findMasters(@Request() req: AuthRequest) {
    return this.svc.findMasters(this.tid(req));
  }

  @Post('masters')
  createMaster(@Request() req: AuthRequest, @Body() dto: Record<string, unknown>) {
    return this.svc.createMaster(this.tid(req), dto);
  }

  @Put('masters/:id')
  updateMaster(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.svc.updateMaster(this.tid(req), id, dto);
  }

  @Delete('masters/:id')
  removeMaster(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.removeMaster(this.tid(req), id);
  }

  // ── Appointments ─────────────────────────────────────────────────────────────

  @Get('appointments/stats')
  getAppointmentStats(@Request() req: AuthRequest) {
    return this.svc.getAppointmentStats(this.tid(req));
  }

  @Get('appointments')
  findAppointments(
    @Request() req: AuthRequest,
    @Query('date') date?: string,
    @Query('masterId') masterId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findAppointments(this.tid(req), date, masterId, status);
  }

  @Post('appointments')
  createAppointment(@Request() req: AuthRequest, @Body() dto: Record<string, unknown>) {
    return this.svc.createAppointment(this.tid(req), dto);
  }

  @Put('appointments/:id')
  updateAppointment(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.svc.updateAppointment(this.tid(req), id, dto);
  }

  @Delete('appointments/:id')
  removeAppointment(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.removeAppointment(this.tid(req), id);
  }
}
