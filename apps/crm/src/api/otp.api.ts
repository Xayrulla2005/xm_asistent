import axios from 'axios';

const pub = axios.create({ baseURL: 'http://localhost:3000/api' });

export interface OtpSendResult   { success: boolean; method?: string; devCode?: string }
export interface OtpVerifyResult { valid: boolean; attemptsLeft: number }

export const sendEmailOtp = (email: string) =>
  pub.post<OtpSendResult>('/otp/send-email', { email }).then((r) => r.data);

export const verifyOtp = (email: string, code: string) =>
  pub.post<OtpVerifyResult>('/otp/verify', { email, code }).then((r) => r.data);

export const sendPhoneOtp = (phone: string) =>
  pub.post<{ success: boolean }>('/otp/send-phone', { phone }).then((r) => r.data);

export const verifyPhoneOtp = (phone: string, code: string) =>
  pub.post<OtpVerifyResult>('/otp/verify-phone', { phone, code }).then((r) => r.data);

