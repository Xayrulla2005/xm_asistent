import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { ClientPortalService } from './client-portal.service';

@Controller('portal/account')
@UseGuards(CustomerJwtGuard)
export class ClientPortalAccountController {
  constructor(private readonly service: ClientPortalService) {}

  @Get()
  getProfile(@Req() req: { user: Customer }) {
    return this.service.getProfile(req.user.id);
  }

  @Patch()
  updateProfile(
    @Req() req: { user: Customer },
    @Body() body: { name?: string; address?: string },
  ) {
    return this.service.updateProfile(req.user.id, body);
  }

  @Get('purchases')
  getPurchases(@Req() req: { user: Customer }) {
    return this.service.getPurchases(req.user.id, req.user.tenantId);
  }

  @Get('debts')
  getDebts(@Req() req: { user: Customer }) {
    return this.service.getDebts(req.user.id, req.user.tenantId);
  }

  @Get('beauty-appointments')
  getBeautyAppointments(@Req() req: { user: Customer }) {
    return this.service.getBeautyAppointments(req.user.id, req.user.tenantId);
  }

  @Get('gym-membership')
  getGymMembership(@Req() req: { user: Customer }) {
    return this.service.getGymMembership(req.user.id, req.user.tenantId);
  }

  @Get('clinic-data')
  getClinicData(@Req() req: { user: Customer }) {
    return this.service.getClinicData(req.user.id, req.user.tenantId);
  }
}
