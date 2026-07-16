import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { Course } from './entities/course.entity';
import { Teacher } from './entities/teacher.entity';
import { Attendance } from './entities/attendance.entity';
import { EduPayment } from './entities/edu-payment.entity';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Course, Teacher, Attendance, EduPayment])],
  controllers: [EducationController],
  providers: [EducationService],
})
export class EducationModule {}
