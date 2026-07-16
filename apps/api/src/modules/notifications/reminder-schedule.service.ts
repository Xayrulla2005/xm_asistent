import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { SmsService } from '../otp/sms.service';
import { BeautyAppointment } from '../beauty/entities/beauty-appointment.entity';
import { GymMember } from '../gym/entities/gym-member.entity';
import { Debt, DebtStatus } from '../debts/entities/debt.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Appointment as ClinicAppointment } from '../clinic/entities/appointment.entity';
import { Patient } from '../clinic/entities/patient.entity';

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ReminderScheduleService {
  private readonly log = new Logger(ReminderScheduleService.name);

  constructor(
    private readonly sms: SmsService,
    @InjectRepository(BeautyAppointment) private readonly beautyApptRepo: Repository<BeautyAppointment>,
    @InjectRepository(GymMember)         private readonly gymMemberRepo:  Repository<GymMember>,
    @InjectRepository(Debt)              private readonly debtRepo:        Repository<Debt>,
    @InjectRepository(Customer)          private readonly customerRepo:    Repository<Customer>,
    @InjectRepository(ClinicAppointment) private readonly clinicApptRepo:  Repository<ClinicAppointment>,
    @InjectRepository(Patient)           private readonly patientRepo:     Repository<Patient>,
  ) {}

  // ── Beauty: qabul eslatmasi (bir kun oldin) ───────────────────────────────

  @Cron('0 9 * * *') // every day at 09:00
  async remindBeautyAppointments(): Promise<void> {
    const tomorrow = toDateStr(addDays(new Date(), 1));
    const appts = await this.beautyApptRepo.find({
      where: { date: tomorrow, status: 'scheduled' },
    });

    let sent = 0;
    for (const a of appts) {
      if (!a.clientPhone) continue;
      const msg =
        `Salom ${a.clientName}! Ertaga ${a.timeSlot} da qabulingiz bor` +
        (a.masterName ? ` (Master: ${a.masterName})` : '') +
        `. Iltimos o'z vaqtida keling.`;
      const ok = await this.sms.send(a.clientPhone, msg);
      if (ok) sent++;
    }

    if (appts.length) this.log.log(`Beauty reminders: ${sent}/${appts.length} sent for ${tomorrow}`);
  }

  // ── Klinika: qabul eslatmasi (bir kun oldin) ──────────────────────────────

  @Cron('5 9 * * *') // 09:05
  async remindClinicAppointments(): Promise<void> {
    const tomorrow = toDateStr(addDays(new Date(), 1));
    const appts = await this.clinicApptRepo.find({
      where: { date: tomorrow, status: 'scheduled' },
    });

    const patientIds = [...new Set(appts.map((a) => a.patientId).filter(Boolean))] as string[];
    if (!patientIds.length) return;

    const patients = await this.patientRepo.findBy({ id: In(patientIds) });
    const phoneMap = new Map(patients.map((p) => [p.id, p.phone]));

    let sent = 0;
    for (const a of appts) {
      const phone = a.patientId ? phoneMap.get(a.patientId) : null;
      if (!phone) continue;
      const name = a.patientName ?? 'Bemor';
      const msg =
        `Salom ${name}! Ertaga ${a.time} da klinikaga qabulingiz bor` +
        (a.doctorName ? ` (${a.doctorName})` : '') +
        `. Iltimos o'z vaqtida keling.`;
      const ok = await this.sms.send(phone, msg);
      if (ok) sent++;
    }

    if (appts.length) this.log.log(`Clinic reminders: ${sent}/${appts.length} sent for ${tomorrow}`);
  }

  // ── Gym: a'zolik tugash eslatmasi (3 kun qoldi) ──────────────────────────

  @Cron('10 9 * * *') // 09:10
  async remindGymExpirations(): Promise<void> {
    const in3 = toDateStr(addDays(new Date(), 3));
    const members = await this.gymMemberRepo.find({
      where: { expiresAt: in3, status: 'active' },
    });

    let sent = 0;
    for (const m of members) {
      if (!m.phone) continue;
      const msg =
        `Salom ${m.firstName} ${m.lastName}! Gym a'zoligingiz 3 kun ichida tugaydi` +
        (m.planName ? ` (${m.planName})` : '') +
        `. Yangilash uchun administratorga murojaat qiling.`;
      const ok = await this.sms.send(m.phone, msg);
      if (ok) sent++;
    }

    if (members.length) this.log.log(`Gym expiry reminders: ${sent}/${members.length} sent`);
  }

  // ── Qarz: muddati yaqinlashmoqda (2 kun qoldi) ───────────────────────────

  @Cron('15 9 * * *') // 09:15
  async remindUpcomingDebts(): Promise<void> {
    const start = toDateStr(addDays(new Date(), 2));
    const end   = start; // exact date match

    const debts = await this.debtRepo.find({
      where: {
        status:  In([DebtStatus.PENDING, DebtStatus.PARTIAL]),
        dueDate: Between(start, end),
      },
    });

    const customerIds = [...new Set(debts.map((d) => d.customerId).filter(Boolean))] as string[];
    if (!customerIds.length) return;

    const customers = await this.customerRepo.findBy({ id: In(customerIds) });
    const custMap   = new Map(customers.map((c) => [c.id, c]));

    let sent = 0;
    for (const d of debts) {
      const cust  = d.customerId ? custMap.get(d.customerId) : null;
      const phone = cust?.phone;
      if (!phone) continue;

      const amount = Number(d.remainingAmount).toLocaleString('uz-UZ');
      const msg =
        `Salom ${d.customerName ?? cust?.name}! Qarzingiz muddati 2 kundan keyin tugaydi. ` +
        `Qoldiq: ${amount} so'm. O'z vaqtida to'lasangiz mamnun bo'lamiz.`;
      const ok = await this.sms.send(phone, msg);
      if (ok) sent++;
    }

    if (debts.length) this.log.log(`Debt reminders: ${sent}/${debts.length} sent`);
  }

  // ── Gym: muddati o'tgan, lekin hali active — ertaga suspend bo'ladi ────────

  @Cron('20 9 * * *') // 09:20
  async remindGymExpiredToday(): Promise<void> {
    const today = toDateStr(new Date());
    const expired = await this.gymMemberRepo.find({
      where: { expiresAt: today, status: 'active' },
    });

    for (const m of expired) {
      if (!m.phone) continue;
      const msg =
        `Salom ${m.firstName}! Gym a'zoligingiz bugun tugadi. ` +
        `Davom etish uchun administratorga murojaat qiling.`;
      await this.sms.send(m.phone, msg);
    }

    if (expired.length) this.log.log(`Gym expired today reminders: ${expired.length}`);
  }
}
