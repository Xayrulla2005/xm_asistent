import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpModule } from '../otp/otp.module';
import { ReminderScheduleService } from './reminder-schedule.service';
import { BeautyAppointment } from '../beauty/entities/beauty-appointment.entity';
import { GymMember } from '../gym/entities/gym-member.entity';
import { Debt } from '../debts/entities/debt.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Appointment as ClinicAppointment } from '../clinic/entities/appointment.entity';
import { Patient } from '../clinic/entities/patient.entity';

@Module({
  imports: [
    OtpModule,
    TypeOrmModule.forFeature([
      BeautyAppointment, GymMember, Debt, Customer, ClinicAppointment, Patient,
    ]),
  ],
  providers: [ReminderScheduleService],
})
export class NotificationsModule {}
