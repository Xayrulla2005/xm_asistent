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
import { AutoService } from './auto.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthRequest = Request & { user: { tenantId: string } };

@Controller('auto')
@UseGuards(JwtAuthGuard)
export class AutoController {
  constructor(private readonly svc: AutoService) {}

  private tid(req: AuthRequest): string {
    return req.user.tenantId;
  }

  // ── Vehicles ────────────────────────────────────────────────────────────────

  @Get('vehicles')
  findVehicles(
    @Request() req: AuthRequest,
    @Query('search') search?: string,
  ) {
    return this.svc.findVehicles(this.tid(req), search);
  }

  @Post('vehicles')
  createVehicle(@Request() req: AuthRequest, @Body() dto: Record<string, unknown>) {
    return this.svc.createVehicle(this.tid(req), dto);
  }

  @Put('vehicles/:id')
  updateVehicle(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.svc.updateVehicle(this.tid(req), id, dto);
  }

  @Delete('vehicles/:id')
  removeVehicle(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.removeVehicle(this.tid(req), id);
  }

  // ── Service Orders ──────────────────────────────────────────────────────────

  @Get('orders/stats')
  getOrderStats(@Request() req: AuthRequest) {
    return this.svc.getOrderStats(this.tid(req));
  }

  @Get('orders')
  findOrders(
    @Request() req: AuthRequest,
    @Query('status') status?: string,
  ) {
    return this.svc.findOrders(this.tid(req), status);
  }

  @Post('orders')
  createOrder(@Request() req: AuthRequest, @Body() dto: Record<string, unknown>) {
    return this.svc.createOrder(this.tid(req), dto);
  }

  @Put('orders/:id')
  updateOrder(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.svc.updateOrder(this.tid(req), id, dto);
  }

  @Delete('orders/:id')
  removeOrder(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.removeOrder(this.tid(req), id);
  }

  @Post('orders/:id/advance')
  advanceStatus(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.advanceStatus(this.tid(req), id);
  }
}
