import api from './axios';

export interface Patient {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Doctor {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  specialty: string | null;
  schedule: string | null;
  consultationFee: number;
  isActive: boolean;
  createdAt: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  patientId: string | null;
  patientName: string | null;
  doctorId: string | null;
  doctorName: string | null;
  specialty: string | null;
  date: string;
  time: string;
  duration: number;
  type: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  fee: number;
  createdAt: string;
}

export interface Medicine {
  id: string;
  tenantId: string;
  name: string;
  category: string | null;
  unit: string | null;
  price: number;
  stock: number;
  minStock: number;
  manufacturer: string | null;
  expiryDate: string | null;
  isActive: boolean;
}

// Patients
export const getPatients = (search?: string) =>
  api.get<Patient[]>('/clinic/patients', { params: search ? { search } : {} }).then((r) => r.data);

export const getPatient = (id: string) =>
  api.get<Patient>(`/clinic/patients/${id}`).then((r) => r.data);

export const createPatient = (dto: Partial<Patient>) =>
  api.post<Patient>('/clinic/patients', dto).then((r) => r.data);

export const updatePatient = (id: string, dto: Partial<Patient>) =>
  api.put<Patient>(`/clinic/patients/${id}`, dto).then((r) => r.data);

export const deletePatient = (id: string) =>
  api.delete(`/clinic/patients/${id}`).then((r) => r.data);

// Doctors
export const getDoctors = () =>
  api.get<Doctor[]>('/clinic/doctors').then((r) => r.data);

export const createDoctor = (dto: Partial<Doctor>) =>
  api.post<Doctor>('/clinic/doctors', dto).then((r) => r.data);

export const updateDoctor = (id: string, dto: Partial<Doctor>) =>
  api.put<Doctor>(`/clinic/doctors/${id}`, dto).then((r) => r.data);

export const deleteDoctor = (id: string) =>
  api.delete(`/clinic/doctors/${id}`).then((r) => r.data);

// Appointments
export const getAppointments = (date?: string) =>
  api.get<Appointment[]>('/clinic/appointments', { params: date ? { date } : {} }).then((r) => r.data);

export const getAppointmentStats = () =>
  api.get<{ total: number; today: number; scheduled: number; completed: number }>('/clinic/appointments/stats').then((r) => r.data);

export const createAppointment = (dto: Partial<Appointment>) =>
  api.post<Appointment>('/clinic/appointments', dto).then((r) => r.data);

export const updateAppointment = (id: string, dto: Partial<Appointment>) =>
  api.put<Appointment>(`/clinic/appointments/${id}`, dto).then((r) => r.data);

export const deleteAppointment = (id: string) =>
  api.delete(`/clinic/appointments/${id}`).then((r) => r.data);

// Medicines
export const getMedicines = (search?: string) =>
  api.get<Medicine[]>('/clinic/medicines', { params: search ? { search } : {} }).then((r) => r.data);

export const createMedicine = (dto: Partial<Medicine>) =>
  api.post<Medicine>('/clinic/medicines', dto).then((r) => r.data);

export const updateMedicine = (id: string, dto: Partial<Medicine>) =>
  api.put<Medicine>(`/clinic/medicines/${id}`, dto).then((r) => r.data);

export const deleteMedicine = (id: string) =>
  api.delete(`/clinic/medicines/${id}`).then((r) => r.data);

export const adjustMedicineStock = (id: string, delta: number) =>
  api.post<Medicine>(`/clinic/medicines/${id}/stock`, { delta }).then((r) => r.data);

// Prescriptions
export interface PrescriptionItem {
  medicineId:   string;
  medicineName: string;
  dosage:       string;
  frequency:    string;
  days:         number;
  notes?:       string;
}

export interface Prescription {
  id:          string;
  tenantId:    string;
  patientId:   string | null;
  patientName: string;
  doctorId:    string | null;
  doctorName:  string;
  date:        string;
  items:       PrescriptionItem[];
  diagnosis:   string | null;
  notes:       string | null;
  status:      string;
  createdAt:   string;
}

export const getPrescriptions = (patientId?: string) =>
  api.get<Prescription[]>('/clinic/prescriptions', { params: patientId ? { patientId } : {} }).then((r) => r.data);
export const createPrescription = (dto: Partial<Prescription>) =>
  api.post<Prescription>('/clinic/prescriptions', dto).then((r) => r.data);
export const updatePrescription = (id: string, dto: Partial<Prescription>) =>
  api.put<Prescription>(`/clinic/prescriptions/${id}`, dto).then((r) => r.data);
export const deletePrescription = (id: string) =>
  api.delete(`/clinic/prescriptions/${id}`).then((r) => r.data);
