import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { Doctor } from './entities/doctor.entity';
import { Appointment } from './entities/appointment.entity';
import { Medicine } from './entities/medicine.entity';
import { Prescription } from './entities/prescription.entity';

@Injectable()
export class ClinicService {
  constructor(
    @InjectRepository(Patient)      private patientRepo:      Repository<Patient>,
    @InjectRepository(Doctor)       private doctorRepo:       Repository<Doctor>,
    @InjectRepository(Appointment)  private appointmentRepo:  Repository<Appointment>,
    @InjectRepository(Medicine)     private medicineRepo:     Repository<Medicine>,
    @InjectRepository(Prescription) private prescriptionRepo: Repository<Prescription>,
  ) {}

  // ── PATIENTS ──────────────────────────────────────────────────────────────

  findPatients(tenantId: string, search?: string) {
    if (search) {
      return this.patientRepo.find({
        where: [
          { tenantId, firstName: ILike(`%${search}%`) },
          { tenantId, lastName:  ILike(`%${search}%`) },
          { tenantId, phone:     ILike(`%${search}%`) },
        ],
        order: { createdAt: 'DESC' },
      });
    }
    return this.patientRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findPatientById(tenantId: string, id: string) {
    const p = await this.patientRepo.findOne({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Bemor topilmadi');
    return p;
  }

  createPatient(tenantId: string, dto: Partial<Patient>) {
    return this.patientRepo.save(this.patientRepo.create({ ...dto, tenantId }));
  }

  async updatePatient(tenantId: string, id: string, dto: Partial<Patient>) {
    await this.findPatientById(tenantId, id);
    await this.patientRepo.update({ id, tenantId }, dto);
    return this.findPatientById(tenantId, id);
  }

  async removePatient(tenantId: string, id: string) {
    await this.findPatientById(tenantId, id);
    await this.patientRepo.update({ id, tenantId }, { isActive: false });
    return { success: true };
  }

  // ── DOCTORS ───────────────────────────────────────────────────────────────

  findDoctors(tenantId: string) {
    return this.doctorRepo.find({ where: { tenantId }, order: { lastName: 'ASC' } });
  }

  async findDoctorById(tenantId: string, id: string) {
    const d = await this.doctorRepo.findOne({ where: { id, tenantId } });
    if (!d) throw new NotFoundException('Shifokor topilmadi');
    return d;
  }

  createDoctor(tenantId: string, dto: Partial<Doctor>) {
    return this.doctorRepo.save(this.doctorRepo.create({ ...dto, tenantId }));
  }

  async updateDoctor(tenantId: string, id: string, dto: Partial<Doctor>) {
    await this.findDoctorById(tenantId, id);
    await this.doctorRepo.update({ id, tenantId }, dto);
    return this.findDoctorById(tenantId, id);
  }

  async removeDoctor(tenantId: string, id: string) {
    await this.findDoctorById(tenantId, id);
    await this.doctorRepo.update({ id, tenantId }, { isActive: false });
    return { success: true };
  }

  // ── APPOINTMENTS ──────────────────────────────────────────────────────────

  findAppointments(tenantId: string, date?: string) {
    if (date) {
      return this.appointmentRepo.find({
        where: { tenantId, date },
        order: { time: 'ASC' },
      });
    }
    return this.appointmentRepo.find({
      where: { tenantId },
      order: { date: 'DESC', time: 'ASC' },
      take: 100,
    });
  }

  async findAppointmentById(tenantId: string, id: string) {
    const a = await this.appointmentRepo.findOne({ where: { id, tenantId } });
    if (!a) throw new NotFoundException('Qabul topilmadi');
    return a;
  }

  createAppointment(tenantId: string, dto: Partial<Appointment>) {
    return this.appointmentRepo.save(this.appointmentRepo.create({ ...dto, tenantId }));
  }

  async updateAppointment(tenantId: string, id: string, dto: Partial<Appointment>) {
    await this.findAppointmentById(tenantId, id);
    await this.appointmentRepo.update({ id, tenantId }, dto);
    return this.findAppointmentById(tenantId, id);
  }

  async removeAppointment(tenantId: string, id: string) {
    await this.findAppointmentById(tenantId, id);
    await this.appointmentRepo.delete({ id, tenantId });
    return { success: true };
  }

  async getAppointmentStats(tenantId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const [total, todayCount, scheduled, completed] = await Promise.all([
      this.appointmentRepo.count({ where: { tenantId } }),
      this.appointmentRepo.count({ where: { tenantId, date: today } }),
      this.appointmentRepo.count({ where: { tenantId, status: 'scheduled' } }),
      this.appointmentRepo.count({ where: { tenantId, status: 'completed' } }),
    ]);
    return { total, today: todayCount, scheduled, completed };
  }

  // ── MEDICINES ─────────────────────────────────────────────────────────────

  findMedicines(tenantId: string, search?: string) {
    if (search) {
      return this.medicineRepo.find({
        where: [
          { tenantId, name: ILike(`%${search}%`) },
          { tenantId, category: ILike(`%${search}%`) },
        ],
        order: { name: 'ASC' },
      });
    }
    return this.medicineRepo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async findMedicineById(tenantId: string, id: string) {
    const m = await this.medicineRepo.findOne({ where: { id, tenantId } });
    if (!m) throw new NotFoundException('Dori topilmadi');
    return m;
  }

  createMedicine(tenantId: string, dto: Partial<Medicine>) {
    return this.medicineRepo.save(this.medicineRepo.create({ ...dto, tenantId }));
  }

  async updateMedicine(tenantId: string, id: string, dto: Partial<Medicine>) {
    await this.findMedicineById(tenantId, id);
    await this.medicineRepo.update({ id, tenantId }, dto);
    return this.findMedicineById(tenantId, id);
  }

  async removeMedicine(tenantId: string, id: string) {
    await this.findMedicineById(tenantId, id);
    await this.medicineRepo.delete({ id, tenantId });
    return { success: true };
  }

  async adjustStock(tenantId: string, id: string, delta: number) {
    const m = await this.findMedicineById(tenantId, id);
    const newStock = Math.max(0, Number(m.stock) + delta);
    await this.medicineRepo.update({ id, tenantId }, { stock: newStock });
    return this.findMedicineById(tenantId, id);
  }

  // ── PRESCRIPTIONS ─────────────────────────────────────────────────────────

  findPrescriptions(tenantId: string, patientId?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (patientId) where['patientId'] = patientId;
    return this.prescriptionRepo.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }

  async findPrescriptionById(tenantId: string, id: string) {
    const p = await this.prescriptionRepo.findOne({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Retsept topilmadi');
    return p;
  }

  createPrescription(tenantId: string, dto: Partial<Prescription>) {
    return this.prescriptionRepo.save(this.prescriptionRepo.create({ ...dto, tenantId }));
  }

  async updatePrescription(tenantId: string, id: string, dto: Partial<Prescription>) {
    await this.findPrescriptionById(tenantId, id);
    await this.prescriptionRepo.update({ id, tenantId }, dto);
    return this.findPrescriptionById(tenantId, id);
  }

  async removePrescription(tenantId: string, id: string) {
    await this.findPrescriptionById(tenantId, id);
    await this.prescriptionRepo.delete({ id, tenantId });
    return { success: true };
  }
}
