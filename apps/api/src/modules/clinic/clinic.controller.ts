import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { ClinicService } from './clinic.service';

function tenantId(user: User): string {
  return (user as unknown as { tenantId: string }).tenantId;
}

@Controller('clinic')
@UseGuards(JwtAuthGuard)
export class ClinicController {
  constructor(private readonly svc: ClinicService) {}

  // ── Patients ──────────────────────────────────────────────────────────────
  @Get('patients')
  getPatients(@CurrentUser() u: User, @Query('search') search?: string) {
    return this.svc.findPatients(tenantId(u), search);
  }

  @Get('patients/:id')
  getPatient(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.findPatientById(tenantId(u), id);
  }

  @Post('patients')
  createPatient(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) {
    return this.svc.createPatient(tenantId(u), dto as never);
  }

  @Put('patients/:id')
  updatePatient(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.svc.updatePatient(tenantId(u), id, dto as never);
  }

  @Delete('patients/:id')
  removePatient(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.removePatient(tenantId(u), id);
  }

  // ── Doctors ───────────────────────────────────────────────────────────────
  @Get('doctors')
  getDoctors(@CurrentUser() u: User) {
    return this.svc.findDoctors(tenantId(u));
  }

  @Get('doctors/:id')
  getDoctor(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.findDoctorById(tenantId(u), id);
  }

  @Post('doctors')
  createDoctor(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) {
    return this.svc.createDoctor(tenantId(u), dto as never);
  }

  @Put('doctors/:id')
  updateDoctor(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.svc.updateDoctor(tenantId(u), id, dto as never);
  }

  @Delete('doctors/:id')
  removeDoctor(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.removeDoctor(tenantId(u), id);
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  @Get('appointments')
  getAppointments(@CurrentUser() u: User, @Query('date') date?: string) {
    return this.svc.findAppointments(tenantId(u), date);
  }

  @Get('appointments/stats')
  getAppointmentStats(@CurrentUser() u: User) {
    return this.svc.getAppointmentStats(tenantId(u));
  }

  @Get('appointments/:id')
  getAppointment(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.findAppointmentById(tenantId(u), id);
  }

  @Post('appointments')
  createAppointment(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) {
    return this.svc.createAppointment(tenantId(u), dto as never);
  }

  @Put('appointments/:id')
  updateAppointment(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.svc.updateAppointment(tenantId(u), id, dto as never);
  }

  @Delete('appointments/:id')
  removeAppointment(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.removeAppointment(tenantId(u), id);
  }

  // ── Medicines (pharmacy) ──────────────────────────────────────────────────
  @Get('medicines')
  getMedicines(@CurrentUser() u: User, @Query('search') search?: string) {
    return this.svc.findMedicines(tenantId(u), search);
  }

  @Get('medicines/:id')
  getMedicine(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.findMedicineById(tenantId(u), id);
  }

  @Post('medicines')
  createMedicine(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) {
    return this.svc.createMedicine(tenantId(u), dto as never);
  }

  @Put('medicines/:id')
  updateMedicine(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.svc.updateMedicine(tenantId(u), id, dto as never);
  }

  @Delete('medicines/:id')
  removeMedicine(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.removeMedicine(tenantId(u), id);
  }

  @Post('medicines/:id/stock')
  adjustStock(@CurrentUser() u: User, @Param('id') id: string, @Body() body: { delta: number }) {
    return this.svc.adjustStock(tenantId(u), id, body.delta);
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────
  @Get('prescriptions')
  getPrescriptions(@CurrentUser() u: User, @Query('patientId') patientId?: string) {
    return this.svc.findPrescriptions(tenantId(u), patientId);
  }

  @Get('prescriptions/:id')
  getPrescription(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.findPrescriptionById(tenantId(u), id);
  }

  @Post('prescriptions')
  createPrescription(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) {
    return this.svc.createPrescription(tenantId(u), dto as never);
  }

  @Put('prescriptions/:id')
  updatePrescription(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.svc.updatePrescription(tenantId(u), id, dto as never);
  }

  @Delete('prescriptions/:id')
  removePrescription(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.removePrescription(tenantId(u), id);
  }
}
