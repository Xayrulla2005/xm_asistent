import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClientPortalService } from './client-portal.service';

@Controller('portal')
export class ClientPortalPublicController {
  constructor(private readonly service: ClientPortalService) {}

  @Get(':slug')
  getPublicPage(@Param('slug') slug: string) {
    return this.service.getPublicPage(slug);
  }

  // Strict throttle on login — 5 attempts per minute to block credential stuffing
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post(':slug/login')
  login(
    @Param('slug') slug: string,
    @Body() body: { phone: string; password: string },
  ) {
    return this.service.customerLogin(slug, body.phone, body.password);
  }

  @Get(':slug/services')
  getServiceCatalog(@Param('slug') slug: string) {
    return this.service.getPublicServiceCatalog(slug);
  }

  @Get(':slug/gym-plans')
  getGymPlans(@Param('slug') slug: string) {
    return this.service.getGymPublicPlans(slug);
  }

  // ── Booking endpoints (authenticated via portal JWT, but slug is enough) ──

  @Post(':slug/book-beauty')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  bookBeautyAppointment(
    @Param('slug') slug: string,
    @Body() body: {
      clientName:  string;
      clientPhone: string;
      serviceId?:  string;
      serviceName?: string;
      date:        string;  // YYYY-MM-DD
      timeSlot:    string;  // HH:MM
      notes?:      string;
    },
  ) {
    if (!body.clientName || !body.clientPhone || !body.date || !body.timeSlot) {
      throw new BadRequestException('clientName, clientPhone, date, timeSlot majburiy');
    }
    return this.service.bookBeautyAppointment(slug, body);
  }

  @Post(':slug/book-clinic')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  bookClinicAppointment(
    @Param('slug') slug: string,
    @Body() body: {
      patientName:  string;
      patientPhone: string;
      date:         string;
      time:         string;
      specialty?:   string;
      notes?:       string;
    },
  ) {
    if (!body.patientName || !body.patientPhone || !body.date || !body.time) {
      throw new BadRequestException('patientName, patientPhone, date, time majburiy');
    }
    return this.service.bookClinicAppointment(slug, body);
  }
}
