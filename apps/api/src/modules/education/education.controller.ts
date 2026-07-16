import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { EducationService } from './education.service';

function tid(u: User): string { return (u as unknown as { tenantId: string }).tenantId; }

@Controller('education')
@UseGuards(JwtAuthGuard)
export class EducationController {
  constructor(private readonly svc: EducationService) {}

  // Students
  @Get('students')
  getStudents(@CurrentUser() u: User, @Query('search') search?: string) { return this.svc.findStudents(tid(u), search); }
  @Get('students/:id')
  getStudent(@CurrentUser() u: User, @Param('id') id: string) { return this.svc.findStudentById(tid(u), id); }
  @Post('students')
  createStudent(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) { return this.svc.createStudent(tid(u), dto as never); }
  @Put('students/:id')
  updateStudent(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) { return this.svc.updateStudent(tid(u), id, dto as never); }
  @Delete('students/:id')
  removeStudent(@CurrentUser() u: User, @Param('id') id: string) { return this.svc.removeStudent(tid(u), id); }

  // Courses
  @Get('courses')
  getCourses(@CurrentUser() u: User) { return this.svc.findCourses(tid(u)); }
  @Get('courses/:id')
  getCourse(@CurrentUser() u: User, @Param('id') id: string) { return this.svc.findCourseById(tid(u), id); }
  @Post('courses')
  createCourse(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) { return this.svc.createCourse(tid(u), dto as never); }
  @Put('courses/:id')
  updateCourse(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) { return this.svc.updateCourse(tid(u), id, dto as never); }
  @Delete('courses/:id')
  removeCourse(@CurrentUser() u: User, @Param('id') id: string) { return this.svc.removeCourse(tid(u), id); }

  // Teachers
  @Get('teachers')
  getTeachers(@CurrentUser() u: User) { return this.svc.findTeachers(tid(u)); }
  @Get('teachers/:id')
  getTeacher(@CurrentUser() u: User, @Param('id') id: string) { return this.svc.findTeacherById(tid(u), id); }
  @Post('teachers')
  createTeacher(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) { return this.svc.createTeacher(tid(u), dto as never); }
  @Put('teachers/:id')
  updateTeacher(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) { return this.svc.updateTeacher(tid(u), id, dto as never); }
  @Delete('teachers/:id')
  removeTeacher(@CurrentUser() u: User, @Param('id') id: string) { return this.svc.removeTeacher(tid(u), id); }

  // Attendance
  @Get('attendance')
  getAttendance(@CurrentUser() u: User, @Query('date') date?: string, @Query('courseId') courseId?: string) {
    return this.svc.findAttendance(tid(u), date, courseId);
  }
  @Get('attendance/stats')
  getAttendanceStats(@CurrentUser() u: User) { return this.svc.getAttendanceStats(tid(u)); }
  @Post('attendance')
  createAttendance(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) { return this.svc.createAttendance(tid(u), dto as never); }
  @Post('attendance/bulk')
  bulkAttendance(@CurrentUser() u: User, @Body() body: { records: Record<string, unknown>[] }) {
    return this.svc.bulkAttendance(tid(u), body.records as never);
  }

  // Payments
  @Get('payments')
  getPayments(@CurrentUser() u: User, @Query('month') month?: string, @Query('studentId') studentId?: string) {
    return this.svc.findPayments(tid(u), month, studentId);
  }
  @Get('payments/stats')
  getPaymentStats(@CurrentUser() u: User, @Query('month') month?: string) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    return this.svc.getPaymentStats(tid(u), m);
  }
  @Post('payments')
  createPayment(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) { return this.svc.createPayment(tid(u), dto as never); }
  @Post('payments/generate')
  generatePayments(@CurrentUser() u: User, @Body() body: { month: string }) {
    return this.svc.generateMonthlyPayments(tid(u), body.month);
  }
  @Post('payments/:id/pay')
  recordPayment(
    @CurrentUser() u: User,
    @Param('id') id: string,
    @Body() body: { amount: number; method?: string; notes?: string },
  ) {
    return this.svc.recordPayment(tid(u), id, body.amount, body.method, body.notes);
  }
}
