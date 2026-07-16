import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpRecord } from './entities/otp-record.entity';
import { SmsService } from './sms.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer') as typeof import('nodemailer');

const MAX_ATTEMPTS = 3;
const OTP_TTL_MS   = 5  * 60_000; // 5 minutes
const LOCKOUT_MS   = 60 * 60_000; // 1 hour

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  // Verified state is short-lived (used during the same registration session)
  private readonly verifiedEmails = new Set<string>();
  private readonly verifiedPhones = new Set<string>();

  constructor(
    @InjectRepository(OtpRecord)
    private readonly repo: Repository<OtpRecord>,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {}

  // ── Lockout check ─────────────────────────────────────────────────────────

  async checkLockout(key: string, type = 'email'): Promise<{ locked: boolean; minutesLeft: number }> {
    const rec = await this.repo.findOne({ where: { key, type } });
    if (!rec?.lockedUntil) return { locked: false, minutesLeft: 0 };
    if (new Date() >= rec.lockedUntil) {
      await this.repo.update({ key, type }, { lockedUntil: null, code: null, attempts: 0 });
      return { locked: false, minutesLeft: 0 };
    }
    const minutesLeft = Math.ceil((rec.lockedUntil.getTime() - Date.now()) / 60_000);
    return { locked: true, minutesLeft };
  }

  async checkPhoneLockout(phone: string): Promise<{ locked: boolean; minutesLeft: number }> {
    return this.checkLockout(phone, 'phone');
  }

  // ── Generic helpers ───────────────────────────────────────────────────────

  private makeCode(): string {
    return Math.floor(100_000 + Math.random() * 900_000).toString();
  }

  private async upsertOtp(key: string, type: string, code: string): Promise<void> {
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await this.repo.upsert(
      { key, type, code, expiresAt, attempts: 0, lockedUntil: null },
      { conflictPaths: ['key', 'type'], skipUpdateIfNoValuesChanged: false },
    );
  }

  private async verifyCode(
    key: string,
    type: string,
  ): Promise<(code: string) => Promise<{ valid: boolean; attemptsLeft: number; lockedMinutes?: number }>> {
    return async (code: string) => {
      const rec = await this.repo.findOne({ where: { key, type } });

      if (!rec) return { valid: false, attemptsLeft: 0 };

      // Check lockout
      if (rec.lockedUntil && new Date() < rec.lockedUntil) {
        const minutesLeft = Math.ceil((rec.lockedUntil.getTime() - Date.now()) / 60_000);
        return { valid: false, attemptsLeft: 0, lockedMinutes: minutesLeft };
      }

      // Check expiry
      if (!rec.code || !rec.expiresAt || new Date() > rec.expiresAt) {
        await this.repo.delete({ key, type });
        return { valid: false, attemptsLeft: 0 };
      }

      if (rec.code !== code) {
        const attempts = rec.attempts + 1;
        const left = MAX_ATTEMPTS - attempts;
        if (left <= 0) {
          const lockedUntil = new Date(Date.now() + LOCKOUT_MS);
          await this.repo.update({ key, type }, { attempts, code: null, lockedUntil });
          this.logger.warn(`[OTP] ${key} — 3 urinish tugadi, 1 soat blok`);
          return { valid: false, attemptsLeft: 0 };
        }
        await this.repo.update({ key, type }, { attempts });
        return { valid: false, attemptsLeft: left };
      }

      // Valid — clear the OTP
      await this.repo.delete({ key, type });
      return { valid: true, attemptsLeft: MAX_ATTEMPTS };
    };
  }

  // ── Email OTP ─────────────────────────────────────────────────────────────

  async verifyOtp(email: string, code: string): Promise<{ valid: boolean; attemptsLeft: number; lockedMinutes?: number }> {
    const verify = await this.verifyCode(email, 'email');
    const result = await verify(code);
    if (result.valid) this.verifiedEmails.add(email);
    return result;
  }

  isEmailVerified(email: string): boolean { return this.verifiedEmails.has(email); }
  clearVerified(email: string): void      { this.verifiedEmails.delete(email); }

  generateAndLog(email: string): string {
    const code = this.makeCode();
    void this.upsertOtp(email, 'email', code);
    this.logger.log(`╔═══════════════════════════════════╗`);
    this.logger.log(`║  EMAIL : ${email}`);
    this.logger.log(`║  KOD   : ${code}`);
    this.logger.log(`╚═══════════════════════════════════╝`);
    return code;
  }

  async sendEmailOtp(email: string): Promise<void> {
    const lock = await this.checkLockout(email, 'email');
    if (lock.locked) throw new Error(`LOCKED:${lock.minutesLeft}`);

    const code = this.makeCode();
    await this.upsertOtp(email, 'email', code);

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
    <p style="margin:0;color:#94a3b8;font-size:13px">Kod 5 daqiqa amal qiladi</p>
  </div>
</div>
</body></html>`;

    const transport = nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   587,
      secure: false,
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
      this.logger.log(`[OTP] Email sent to ${email}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[OTP] Gmail SMTP xato: ${msg}`);
      throw new Error(msg);
    }
  }

  // ── Phone OTP ─────────────────────────────────────────────────────────────

  async sendPhoneOtp(phone: string): Promise<void> {
    const lock = await this.checkPhoneLockout(phone);
    if (lock.locked) throw new Error(`LOCKED:${lock.minutesLeft}`);
    const code = this.makeCode();
    await this.upsertOtp(phone, 'phone', code);

    this.logger.log(`[OTP-PHONE] Code for ${phone}: ${code}`);

    const message = `XM Asistent: Tasdiqlash kodingiz: ${code}. Kod 5 daqiqa amal qiladi.`;
    await this.sms.send(phone, message);
  }

  async verifyPhoneOtp(phone: string, code: string): Promise<{ valid: boolean; attemptsLeft: number; lockedMinutes?: number }> {
    const verify = await this.verifyCode(phone, 'phone');
    const result = await verify(code);
    if (result.valid) this.verifiedPhones.add(phone);
    return result;
  }

  isPhoneVerified(phone: string): boolean { return this.verifiedPhones.has(phone); }
  clearVerifiedPhone(phone: string): void  { this.verifiedPhones.delete(phone); }
}
