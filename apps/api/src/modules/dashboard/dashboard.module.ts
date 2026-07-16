import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { Product } from '../products/entities/product.entity';
import { RestOrder } from '../restaurant/entities/order.entity';
import { Appointment } from '../clinic/entities/appointment.entity';
import { Student } from '../education/entities/student.entity';
import { EduPayment } from '../education/entities/edu-payment.entity';
import { GymMember } from '../gym/entities/gym-member.entity';
import { GymCheckIn } from '../gym/entities/gym-checkin.entity';
import { BeautyAppointment } from '../beauty/entities/beauty-appointment.entity';
import { AutoServiceOrder } from '../auto/entities/auto-service-order.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      Product,
      RestOrder,
      Appointment,
      Student,
      EduPayment,
      GymMember,
      GymCheckIn,
      BeautyAppointment,
      AutoServiceOrder,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
