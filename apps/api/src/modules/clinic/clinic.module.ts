import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { Doctor } from './entities/doctor.entity';
import { Appointment } from './entities/appointment.entity';
import { Medicine } from './entities/medicine.entity';
import { Prescription } from './entities/prescription.entity';
import { ClinicService } from './clinic.service';
import { ClinicController } from './clinic.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Patient, Doctor, Appointment, Medicine, Prescription])],
  controllers: [ClinicController],
  providers: [ClinicService],
})
export class ClinicModule {}
