import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Student } from './entities/student.entity';
import { Course } from './entities/course.entity';
import { Teacher } from './entities/teacher.entity';
import { Attendance } from './entities/attendance.entity';
import { EduPayment } from './entities/edu-payment.entity';

@Injectable()
export class EducationService {
  constructor(
    @InjectRepository(Student)     private studentRepo:    Repository<Student>,
    @InjectRepository(Course)      private courseRepo:     Repository<Course>,
    @InjectRepository(Teacher)     private teacherRepo:    Repository<Teacher>,
    @InjectRepository(Attendance)  private attendanceRepo: Repository<Attendance>,
    @InjectRepository(EduPayment)  private paymentRepo:    Repository<EduPayment>,
  ) {}

  // Students
  findStudents(tenantId: string, search?: string) {
    if (search) {
      return this.studentRepo.find({
        where: [
          { tenantId, firstName: ILike(`%${search}%`) },
          { tenantId, lastName:  ILike(`%${search}%`) },
          { tenantId, phone:     ILike(`%${search}%`) },
        ],
        order: { createdAt: 'DESC' },
      });
    }
    return this.studentRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findStudentById(tenantId: string, id: string) {
    const s = await this.studentRepo.findOne({ where: { id, tenantId } });
    if (!s) throw new NotFoundException("O'quvchi topilmadi");
    return s;
  }

  createStudent(tenantId: string, dto: Partial<Student>) {
    return this.studentRepo.save(this.studentRepo.create({ ...dto, tenantId }));
  }

  async updateStudent(tenantId: string, id: string, dto: Partial<Student>) {
    await this.findStudentById(tenantId, id);
    await this.studentRepo.update({ id, tenantId }, dto);
    return this.findStudentById(tenantId, id);
  }

  async removeStudent(tenantId: string, id: string) {
    await this.findStudentById(tenantId, id);
    await this.studentRepo.update({ id, tenantId }, { status: 'inactive' });
    return { success: true };
  }

  // Courses
  findCourses(tenantId: string) {
    return this.courseRepo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async findCourseById(tenantId: string, id: string) {
    const c = await this.courseRepo.findOne({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Kurs topilmadi');
    return c;
  }

  createCourse(tenantId: string, dto: Partial<Course>) {
    return this.courseRepo.save(this.courseRepo.create({ ...dto, tenantId }));
  }

  async updateCourse(tenantId: string, id: string, dto: Partial<Course>) {
    await this.findCourseById(tenantId, id);
    await this.courseRepo.update({ id, tenantId }, dto);
    return this.findCourseById(tenantId, id);
  }

  async removeCourse(tenantId: string, id: string) {
    await this.findCourseById(tenantId, id);
    await this.courseRepo.update({ id, tenantId }, { isActive: false });
    return { success: true };
  }

  // Teachers
  findTeachers(tenantId: string) {
    return this.teacherRepo.find({ where: { tenantId }, order: { lastName: 'ASC' } });
  }

  async findTeacherById(tenantId: string, id: string) {
    const t = await this.teacherRepo.findOne({ where: { id, tenantId } });
    if (!t) throw new NotFoundException("O'qituvchi topilmadi");
    return t;
  }

  createTeacher(tenantId: string, dto: Partial<Teacher>) {
    return this.teacherRepo.save(this.teacherRepo.create({ ...dto, tenantId }));
  }

  async updateTeacher(tenantId: string, id: string, dto: Partial<Teacher>) {
    await this.findTeacherById(tenantId, id);
    await this.teacherRepo.update({ id, tenantId }, dto);
    return this.findTeacherById(tenantId, id);
  }

  async removeTeacher(tenantId: string, id: string) {
    await this.findTeacherById(tenantId, id);
    await this.teacherRepo.update({ id, tenantId }, { isActive: false });
    return { success: true };
  }

  // Attendance
  findAttendance(tenantId: string, date?: string, courseId?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (date)     where['date']     = date;
    if (courseId) where['courseId'] = courseId;
    return this.attendanceRepo.find({ where, order: { date: 'DESC', createdAt: 'DESC' } });
  }

  createAttendance(tenantId: string, dto: Partial<Attendance>) {
    return this.attendanceRepo.save(this.attendanceRepo.create({ ...dto, tenantId }));
  }

  async bulkAttendance(tenantId: string, records: Partial<Attendance>[]) {
    const entities = records.map((r) => this.attendanceRepo.create({ ...r, tenantId }));
    return this.attendanceRepo.save(entities);
  }

  async getAttendanceStats(tenantId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const [total, present, absent, today30] = await Promise.all([
      this.studentRepo.count({ where: { tenantId, status: 'active' } }),
      this.attendanceRepo.count({ where: { tenantId, date: today, status: 'present' } }),
      this.attendanceRepo.count({ where: { tenantId, date: today, status: 'absent'  } }),
      this.attendanceRepo.count({ where: { tenantId } }),
    ]);
    return { totalStudents: total, todayPresent: present, todayAbsent: absent, totalRecords: today30 };
  }

  // ── PAYMENTS ──────────────────────────────────────────────────────────────

  findPayments(tenantId: string, month?: string, studentId?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (month)     where['month']     = month;
    if (studentId) where['studentId'] = studentId;
    return this.paymentRepo.find({ where, order: { month: 'DESC', createdAt: 'DESC' } });
  }

  async findPaymentById(tenantId: string, id: string) {
    const p = await this.paymentRepo.findOne({ where: { id, tenantId } });
    if (!p) throw new NotFoundException("To'lov topilmadi");
    return p;
  }

  createPayment(tenantId: string, dto: Partial<EduPayment>) {
    return this.paymentRepo.save(this.paymentRepo.create({ ...dto, tenantId }));
  }

  async recordPayment(tenantId: string, id: string, paidAmount: number, method?: string, notes?: string) {
    const payment = await this.findPaymentById(tenantId, id);
    const newPaid = Math.min(Number(payment.amount), Number(payment.paidAmount) + paidAmount);
    const status  = newPaid >= Number(payment.amount) ? 'paid' : newPaid > 0 ? 'partial' : payment.status;
    await this.paymentRepo.update({ id, tenantId }, {
      paidAmount: newPaid,
      status,
      paidAt: status === 'paid' ? new Date().toISOString().slice(0, 10) : payment.paidAt,
      paymentMethod: method ?? payment.paymentMethod,
      notes: notes ?? payment.notes,
    });
    return this.findPaymentById(tenantId, id);
  }

  async generateMonthlyPayments(tenantId: string, month: string) {
    const students = await this.studentRepo.find({ where: { tenantId, status: 'active' } });
    const existing = await this.paymentRepo.find({ where: { tenantId, month } });
    const existingIds = new Set(existing.map((p) => p.studentId));
    const toCreate = students.filter((s) => !existingIds.has(s.id));
    if (!toCreate.length) return { created: 0, skipped: existing.length };
    const entities = toCreate.map((s) =>
      this.paymentRepo.create({
        tenantId, month,
        studentId:   s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        courseId:    s.courseId   ?? null,
        courseName:  s.courseName ?? '',
        amount:      Number(s.monthlyFee),
        paidAmount:  0,
        status:      'pending',
      })
    );
    await this.paymentRepo.save(entities);
    return { created: entities.length, skipped: existing.length };
  }

  async getPaymentStats(tenantId: string, month: string) {
    const payments = await this.paymentRepo.find({ where: { tenantId, month } });
    const total    = payments.reduce((s, p) => s + Number(p.amount), 0);
    const paid     = payments.reduce((s, p) => s + Number(p.paidAmount), 0);
    const paidCount    = payments.filter((p) => p.status === 'paid').length;
    const pendingCount = payments.filter((p) => p.status === 'pending' || p.status === 'overdue').length;
    const partialCount = payments.filter((p) => p.status === 'partial').length;
    return { total, paid, pending: total - paid, paidCount, pendingCount, partialCount, count: payments.length };
  }
}
