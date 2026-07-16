import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer') as typeof import('nodemailer');

interface OtpEntry {
  code:      string;
  expiresAt: Date;
  attempts:  number;
}

const MAX_ATTEMPTS   = 3;
const LOCKOUT_MS     = 60 * 60 * 1000; // 1 soat

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  // email OTPs
  private readonly otps           = new Map<string, OtpEntry>();
  private readonly verifiedEmails = new Set<string>();
  // email lockout: email → qachongacha bloklangan
  private readonly emailLockouts  = new Map<string, Date>();

  // phone OTPs
  private readonly phoneOtps      = new Map<string, OtpEntry>();
  private readonly verifiedPhones = new Set<string>();
  private readonly phoneLockouts  = new Map<string, Date>();

  constructor(private readonly config: ConfigService) {}

  // ── Lockout tekshirish ────────────────────────────────────────────────────

  checkLockout(email: string): { locked: boolean; minutesLeft: number } {
    return this.checkLockoutMap(this.emailLockouts, email);
  }

  checkPhoneLockout(phone: string): { locked: boolean; minutesLeft: number } {
    return this.checkLockoutMap(this.phoneLockouts, phone);
  }

  private checkLockoutMap(map: Map<string, Date>, key: string): { locked: boolean; minutesLeft: number } {
    const until = map.get(key);
    if (!until) return { locked: false, minutesLeft: 0 };
    if (new Date() >= until) {
      map.delete(key);
      return { locked: false, minutesLeft: 0 };
    }
    const minutesLeft = Math.ceil((until.getTime() - Date.now()) / 60_000);
    return { locked: true, minutesLeft };
  }

  // ── Generic helpers ───────────────────────────────────────────────────────

  private makeCode(): string {
    return Math.floor(100_000 + Math.random() * 900_000).toString();
  }

  private getOrCreate(map: Map<string, OtpEntry>, key: string): string {
    const existing = map.get(key);
    if (existing && new Date() < existing.expiresAt) return existing.code;
    const code = this.makeCode();
    map.set(key, { code, expiresAt: new Date(Date.now() + 5 * 60_000), attempts: 0 });
    return code;
  }

  private verifyEntry(
    map: Map<string, OtpEntry>,
    key: string,
    code: string,
    lockoutMap?: Map<string, Date>,
  ): { valid: boolean; attemptsLeft: number } {
    const entry = map.get(key);
    if (!entry) return { valid: false, attemptsLeft: 0 };
    if (new Date() > entry.expiresAt) { map.delete(key); return { valid: false, attemptsLeft: 0 }; }

    entry.attempts++;
    if (entry.code !== code) {
      const left = MAX_ATTEMPTS - entry.attempts;
      if (left <= 0) {
        map.delete(key);
        // 1 soatlik blok qo'ying
        if (lockoutMap) {
          lockoutMap.set(key, new Date(Date.now() + LOCKOUT_MS));
          this.logger.warn(`[OTP] ${key} — 3 urinish tugadi, 1 soat blok`);
        }
      }
      return { valid: false, attemptsLeft: Math.max(0, left) };
    }
    map.delete(key);
    return { valid: true, attemptsLeft: MAX_ATTEMPTS };
  }

  // ── Email OTP ─────────────────────────────────────────────────────────────

  verifyOtp(email: string, code: string): { valid: boolean; attemptsLeft: number; lockedMinutes?: number } {
    // Blok tekshir
    const lock = this.checkLockout(email);
    if (lock.locked) {
      return { valid: false, attemptsLeft: 0, lockedMinutes: lock.minutesLeft };
    }
    const result = this.verifyEntry(this.otps, email, code, this.emailLockouts);
    if (result.valid) this.verifiedEmails.add(email);
    return result;
  }

  isEmailVerified(email: string): boolean { return this.verifiedEmails.has(email); }
  clearVerified(email: string): void      { this.verifiedEmails.delete(email); }

  /** OTP kodni yaratadi, consolega chiqaradi va qaytaradi */
  generateAndLog(email: string): string {
    const code = this.getOrCreate(this.otps, email);
    this.logger.log(`╔═══════════════════════════════════╗`);
    this.logger.log(`║  EMAIL : ${email}`);
    this.logger.log(`║  KOD   : ${code}`);
    this.logger.log(`╚═══════════════════════════════════╝`);
    return code;
  }

  async sendEmailOtp(email: string): Promise<void> {
    // Blok tekshir (avvalgi 3 urinish)
    const lock = this.checkLockout(email);
    if (lock.locked) {
      throw new Error(`LOCKED:${lock.minutesLeft}`);
    }
    // Har doim yangi kod va yangi expiry — resend da vaqt tiklanadi
    const code = this.makeCode();
    this.otps.set(email, { code, expiresAt: new Date(Date.now() + 5 * 60_000), attempts: 0 });

    // Har doim console ga chiqar
    this.logger.log(`╔════════════════════════════════╗`);
    this.logger.log(`║  OTP  ${email}`);
    this.logger.log(`║  KOD: ${code}`);
    this.logger.log(`╚════════════════════════════════╝`);

    const gmailUser = this.config.get<string>('GMAIL_USER') ?? '';
    const gmailPass = this.config.get<string>('GMAIL_APP_PASSWORD') ?? '';

    if (!gmailUser.includes('@') || !gmailPass) {
      this.logger.warn(`[OTP] Gmail not configured — code only in console`);
      return;
    }

    const digitBoxes = code
      .split('')
      .map(
        (d) =>
          `<td style="width:48px;height:60px;background:rgba(139,92,246,0.15);border:2px solid rgba(139,92,246,0.4);border-radius:10px;font-size:28px;font-weight:900;color:#fff;text-align:center;vertical-align:middle;font-family:monospace">${d}</td>`,
      )
      .join('<td style="width:6px"></td>');

    const html = `<!DOCTYPE html><html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#0a0a0f;font-family:sans-serif">
<div style="max-width:480px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:16px 16px 0 0;padding:28px;text-align:center">
    <h2 style="margin:0;color:#fff;font-size:18px">XM Assistant — Tasdiqlash kodi</h2>
  </div>
  <div style="background:#111;border:1px solid rgba(139,92,246,0.2);border-top:none;border-radius:0 0 16px 16px;padding:32px;text-align:center">
    <p style="margin:0 0 24px;color:#94a3b8;font-size:14px">Ro'yxatdan o'tish uchun kodni kiriting:</p>
    <table style="border-collapse:separate;border-spacing:0;margin:0 auto 24px"><tr>${digitBoxes}</tr></table>
    <p style="margin:0;color:#94a3b8;font-size:13px">⏱ Kod 5 daqiqa amal qiladi</p>
  </div>
</div>
</body></html>`;

    // Aniq SMTP sozlamalar (service:'gmail' ba'zida ishlamaydi)
    const transport = nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   587,
      secure: false, // STARTTLS
      auth:   { user: gmailUser, pass: gmailPass },
      tls:    { rejectUnauthorized: false },
    });

    try {
      await transport.sendMail({
        from:    `"XM Assistant" <${gmailUser}>`,
        to:      email,
        subject: 'XM Assistant — Tasdiqlash kodi',
        html,
      });
      this.logger.log(`[OTP] ✅ Email sent to ${email}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[OTP] ❌ Gmail SMTP xato: ${msg}`);
      // OTP hali ham consoleda — throw qilib yuboramiz controller ushlasin
      throw new Error(msg);
    }
  }

  // ── Phone OTP ─────────────────────────────────────────────────────────────

  async sendPhoneOtp(phone: string): Promise<void> {
    const lock = this.checkPhoneLockout(phone);
    if (lock.locked) throw new Error(`LOCKED:${lock.minutesLeft}`);
    const code = this.getOrCreate(this.phoneOtps, phone);
    this.logger.log(`[OTP-PHONE] Code for ${phone}: ${code}`);
  }

  verifyPhoneOtp(phone: string, code: string): { valid: boolean; attemptsLeft: number; lockedMinutes?: number } {
    const lock = this.checkPhoneLockout(phone);
    if (lock.locked) return { valid: false, attemptsLeft: 0, lockedMinutes: lock.minutesLeft };
    const result = this.verifyEntry(this.phoneOtps, phone, code, this.phoneLockouts);
    if (result.valid) this.verifiedPhones.add(phone);
    return result;
  }

  isPhoneVerified(phone: string): boolean { return this.verifiedPhones.has(phone); }
  clearVerifiedPhone(phone: string): void  { this.verifiedPhones.delete(phone); }

}
