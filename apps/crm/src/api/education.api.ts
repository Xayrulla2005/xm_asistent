import api from './axios';

export interface Student {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  parentPhone: string | null;
  courseId: string | null;
  courseName: string | null;
  group: string | null;
  level: string | null;
  monthlyFee: number;
  status: string;
  enrolledAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Course {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  teacherId: string | null;
  teacherName: string | null;
  durationMonths: number;
  monthlyFee: number;
  schedule: string | null;
  level: string | null;
  isActive: boolean;
  maxStudents: number;
  createdAt: string;
}

export interface Teacher {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  subject: string | null;
  salary: number;
  schedule: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  studentId: string | null;
  studentName: string | null;
  courseId: string | null;
  courseName: string | null;
  date: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

// Students
export const getStudents = (search?: string) =>
  api.get<Student[]>('/education/students', { params: search ? { search } : {} }).then((r) => r.data);
export const createStudent = (dto: Partial<Student>) =>
  api.post<Student>('/education/students', dto).then((r) => r.data);
export const updateStudent = (id: string, dto: Partial<Student>) =>
  api.put<Student>(`/education/students/${id}`, dto).then((r) => r.data);
export const deleteStudent = (id: string) =>
  api.delete(`/education/students/${id}`).then((r) => r.data);

// Courses
export const getCourses = () =>
  api.get<Course[]>('/education/courses').then((r) => r.data);
export const createCourse = (dto: Partial<Course>) =>
  api.post<Course>('/education/courses', dto).then((r) => r.data);
export const updateCourse = (id: string, dto: Partial<Course>) =>
  api.put<Course>(`/education/courses/${id}`, dto).then((r) => r.data);
export const deleteCourse = (id: string) =>
  api.delete(`/education/courses/${id}`).then((r) => r.data);

// Teachers
export const getTeachers = () =>
  api.get<Teacher[]>('/education/teachers').then((r) => r.data);
export const createTeacher = (dto: Partial<Teacher>) =>
  api.post<Teacher>('/education/teachers', dto).then((r) => r.data);
export const updateTeacher = (id: string, dto: Partial<Teacher>) =>
  api.put<Teacher>(`/education/teachers/${id}`, dto).then((r) => r.data);
export const deleteTeacher = (id: string) =>
  api.delete(`/education/teachers/${id}`).then((r) => r.data);

// Attendance
export const getAttendance = (date?: string, courseId?: string) =>
  api.get<AttendanceRecord[]>('/education/attendance', { params: { date, courseId } }).then((r) => r.data);
export const getAttendanceStats = () =>
  api.get<{ totalStudents: number; todayPresent: number; todayAbsent: number; totalRecords: number }>('/education/attendance/stats').then((r) => r.data);
export const createAttendance = (dto: Partial<AttendanceRecord>) =>
  api.post<AttendanceRecord>('/education/attendance', dto).then((r) => r.data);
export const bulkAttendance = (records: Partial<AttendanceRecord>[]) =>
  api.post<AttendanceRecord[]>('/education/attendance/bulk', { records }).then((r) => r.data);

// Payments
export interface EduPayment {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  courseId: string | null;
  courseName: string | null;
  month: string;
  amount: number;
  paidAmount: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  paidAt: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStats {
  total: number;
  paid: number;
  pending: number;
  paidCount: number;
  pendingCount: number;
  partialCount: number;
  count: number;
}

export const getPayments = (month?: string, studentId?: string) =>
  api.get<EduPayment[]>('/education/payments', { params: { month, studentId } }).then((r) => r.data);
export const getPaymentStats = (month?: string) =>
  api.get<PaymentStats>('/education/payments/stats', { params: { month } }).then((r) => r.data);
export const createPayment = (dto: Partial<EduPayment>) =>
  api.post<EduPayment>('/education/payments', dto).then((r) => r.data);
export const generatePayments = (month: string) =>
  api.post<{ created: number; skipped: number }>('/education/payments/generate', { month }).then((r) => r.data);
export const recordPayment = (id: string, amount: number, method?: string, notes?: string) =>
  api.post<EduPayment>(`/education/payments/${id}/pay`, { amount, method, notes }).then((r) => r.data);
