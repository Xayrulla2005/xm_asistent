import api from './axios';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Promotion {
  id:          string;
  tenantId:    string;
  title:       string;
  description: string | null;
  imageUrl:    string | null;
  validUntil:  string | null;
  isActive:    boolean;
  createdAt:   string;
}

export interface Announcement {
  id:        string;
  tenantId:  string;
  title:     string;
  body:      string | null;
  isActive:  boolean;
  createdAt: string;
}

export interface PortalTenant {
  id:           string;
  name:         string;
  slug:         string;
  industry:     string | null;
  primaryColor: string | null;
  logo:         string | null;
  phone:        string | null;
  address:      string | null;
}

export interface PortalPublicPage {
  tenant:        PortalTenant;
  promos:        Promotion[];
  announcements: Announcement[];
}

export interface ServiceCatalogItem {
  id:        string;
  name:      string;
  category:  string | null;
  duration:  number;
  price:     number;
}

export interface BeautyAppointment {
  id:           string;
  clientName:   string;
  clientPhone:  string | null;
  masterName:   string | null;
  serviceName:  string | null;
  servicePrice: number;
  date:         string;
  timeSlot:     string;
  duration:     number;
  status:       string;
  notes:        string | null;
  createdAt:    string;
}

export interface GymMemberData {
  id:            string;
  firstName:     string;
  lastName:      string;
  phone:         string | null;
  planName:      string | null;
  planPrice:     number | null;
  joinedAt:      string | null;
  expiresAt:     string | null;
  status:        string;
  totalCheckins: number;
  notes:         string | null;
}

export interface GymCheckin {
  id:         string;
  memberName: string;
  note:       string | null;
  checkedAt:  string;
}

export interface GymPlanData {
  id:           string;
  name:         string;
  description:  string | null;
  durationDays: number;
  price:        number;
}

export interface GymMembershipData {
  member:         GymMemberData | null;
  recentCheckins: GymCheckin[];
  plan:           GymPlanData | null;
}

export interface ClinicPatientData {
  id:          string;
  firstName:   string;
  lastName:    string;
  phone:       string | null;
  dateOfBirth: string | null;
  gender:      string | null;
  bloodType:   string | null;
  address:     string | null;
  notes:       string | null;
}

export interface ClinicAppointmentData {
  id:          string;
  doctorName:  string | null;
  specialty:   string | null;
  date:        string;
  time:        string;
  duration:    number;
  type:        string | null;
  status:      string;
  notes:       string | null;
  fee:         number;
  createdAt:   string;
}

export interface PrescriptionItem {
  medicineId:   string;
  medicineName: string;
  dosage:       string;
  frequency:    string;
  days:         number;
  notes?:       string;
}

export interface ClinicPrescriptionData {
  id:          string;
  doctorName:  string;
  date:        string;
  diagnosis:   string | null;
  notes:       string | null;
  status:      string;
  items:       PrescriptionItem[];
  createdAt:   string;
}

export interface ClinicPortalData {
  patient:       ClinicPatientData | null;
  appointments:  ClinicAppointmentData[];
  prescriptions: ClinicPrescriptionData[];
}

export interface PortalCustomer {
  id:        string;
  name:      string;
  phone:     string;
  address:   string | null;
  tenantId:  string;
  totalDebt: number;
  createdAt?: string;
}

export interface PortalSale {
  id:          string;
  totalAmount: number;
  paymentType: string;
  status:      string;
  customerName:string;
  items:       Array<{ productId: string; name: string; price: number; quantity: number; discount: number }>;
  createdAt:   string;
}

export interface PortalDebt {
  id:             string;
  saleId:         string;
  originalAmount: number;
  remainingAmount:number;
  status:         string;
  dueDate:        string | null;
  createdAt:      string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TOKEN_KEY = (slug: string) => `cp_token_${slug}`;
const CUST_KEY  = (slug: string) => `cp_customer_${slug}`;

export function getStoredToken(slug: string): string | null {
  return localStorage.getItem(TOKEN_KEY(slug));
}

export function getStoredCustomer(slug: string): PortalCustomer | null {
  try {
    const raw = localStorage.getItem(CUST_KEY(slug));
    return raw ? (JSON.parse(raw) as PortalCustomer) : null;
  } catch { return null; }
}

export function saveSession(slug: string, token: string, customer: PortalCustomer) {
  localStorage.setItem(TOKEN_KEY(slug), token);
  localStorage.setItem(CUST_KEY(slug), JSON.stringify(customer));
}

export function clearSession(slug: string) {
  localStorage.removeItem(TOKEN_KEY(slug));
  localStorage.removeItem(CUST_KEY(slug));
}

function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function getPortalPage(slug: string): Promise<PortalPublicPage> {
  const { data } = await api.get(`/portal/${slug}`);
  return data;
}

export async function customerLogin(
  slug: string,
  phone: string,
  password: string,
): Promise<{ accessToken: string; customer: PortalCustomer }> {
  const { data } = await api.post(`/portal/${slug}/login`, { phone, password });
  return data;
}

// ── Account API (customer JWT required) ───────────────────────────────────────

export async function getPortalProfile(token: string): Promise<PortalCustomer> {
  const { data } = await api.get('/portal/account', authHeader(token));
  return data;
}

export async function updatePortalProfile(
  token: string,
  dto: { name?: string; address?: string },
): Promise<PortalCustomer> {
  const { data } = await api.patch('/portal/account', dto, authHeader(token));
  return data;
}

export async function getPortalPurchases(token: string): Promise<PortalSale[]> {
  const { data } = await api.get('/portal/account/purchases', authHeader(token));
  return data;
}

export async function getPortalDebts(token: string): Promise<PortalDebt[]> {
  const { data } = await api.get('/portal/account/debts', authHeader(token));
  return data;
}

export async function getBeautyAppointments(token: string): Promise<BeautyAppointment[]> {
  const { data } = await api.get('/portal/account/beauty-appointments', authHeader(token));
  return data;
}

export async function getGymMembership(token: string): Promise<GymMembershipData> {
  const { data } = await api.get('/portal/account/gym-membership', authHeader(token));
  return data;
}

export async function getPublicServiceCatalog(slug: string): Promise<ServiceCatalogItem[]> {
  const { data } = await api.get(`/portal/${slug}/services`);
  return data;
}

export async function getPublicGymPlans(slug: string): Promise<GymPlanData[]> {
  const { data } = await api.get(`/portal/${slug}/gym-plans`);
  return data;
}

export async function getClinicData(token: string): Promise<ClinicPortalData> {
  const { data } = await api.get('/portal/account/clinic-data', authHeader(token));
  return data;
}

// ── Booking (public — no JWT required, only slug) ──────────────────────────

export async function bookBeautyAppointment(
  slug: string,
  dto: {
    clientName:   string;
    clientPhone:  string;
    serviceId?:   string;
    serviceName?: string;
    date:         string;
    timeSlot:     string;
    notes?:       string;
  },
): Promise<BeautyAppointment> {
  const { data } = await api.post(`/portal/${slug}/book-beauty`, dto);
  return data;
}

export async function bookClinicAppointment(
  slug: string,
  dto: {
    patientName:  string;
    patientPhone: string;
    date:         string;
    time:         string;
    specialty?:   string;
    notes?:       string;
  },
): Promise<ClinicAppointmentData> {
  const { data } = await api.post(`/portal/${slug}/book-clinic`, dto);
  return data;
}

// ── Admin API (staff JWT required — uses default api interceptor) ──────────────

export async function setCustomerPortalAccess(
  customerId: string,
  password: string,
): Promise<{ success: boolean; name: string }> {
  const { data } = await api.post(`/portal/admin/customers/${customerId}/access`, {
    password, enabled: true,
  });
  return data;
}

export async function removeCustomerPortalAccess(customerId: string): Promise<void> {
  await api.delete(`/portal/admin/customers/${customerId}/access`);
}

export async function getAdminPromotions(tenantId: string): Promise<Promotion[]> {
  const { data } = await api.get(`/portal/admin/${tenantId}/promotions`);
  return data;
}

export async function createPromotion(
  tenantId: string,
  dto: { title: string; description?: string; validUntil?: string },
): Promise<Promotion> {
  const { data } = await api.post(`/portal/admin/${tenantId}/promotions`, dto);
  return data;
}

export async function updatePromotion(
  id: string,
  dto: Partial<{ title: string; description: string; isActive: boolean; validUntil: string }>,
): Promise<Promotion> {
  const { data } = await api.patch(`/portal/admin/promotions/${id}`, dto);
  return data;
}

export async function deletePromotion(id: string): Promise<void> {
  await api.delete(`/portal/admin/promotions/${id}`);
}

export async function getAdminAnnouncements(tenantId: string): Promise<Announcement[]> {
  const { data } = await api.get(`/portal/admin/${tenantId}/announcements`);
  return data;
}

export async function createAnnouncement(
  tenantId: string,
  dto: { title: string; body?: string },
): Promise<Announcement> {
  const { data } = await api.post(`/portal/admin/${tenantId}/announcements`, dto);
  return data;
}

export async function updateAnnouncement(
  id: string,
  dto: Partial<{ title: string; body: string; isActive: boolean }>,
): Promise<Announcement> {
  const { data } = await api.patch(`/portal/admin/announcements/${id}`, dto);
  return data;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await api.delete(`/portal/admin/announcements/${id}`);
}
