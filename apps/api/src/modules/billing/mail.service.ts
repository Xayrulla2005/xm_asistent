import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor() {
    const host = process.env['SMTP_HOST'];
    const port = Number(process.env['SMTP_PORT'] ?? 587);
    const user = process.env['SMTP_USER'];
    const pass = process.env['SMTP_PASS'];
    this.from  = process.env['SMTP_FROM'] ?? 'noreply@xmasistent.uz';

    this.enabled = !!(host && user && pass);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    } else {
      this.log.warn('SMTP not configured — email notifications disabled');
      // stub transporter that never sends
      this.transporter = null as unknown as Transporter;
    }
  }

  async sendBillingNotification(
    to: string,
    tenantName: string,
    event: 'trial_expired' | 'trial_ending_soon' | 'payment_overdue' | 'payment_due_soon',
    extra?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.enabled) return;

    const { subject, text } = this.buildMessage(tenantName, event, extra);

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
      this.log.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.log.error(`Email failed to ${to}: ${err}`);
    }
  }

  private buildMessage(
    tenantName: string,
    event: string,
    extra?: Record<string, unknown>,
  ): { subject: string; text: string } {
    switch (event) {
      case 'trial_expired':
        return {
          subject: `${tenantName} — Trial muddati tugadi`,
          text: `Hurmatli foydalanuvchi,\n\n${tenantName} akkauntingizning bepul sinov muddati tugadi.\nAkkauntingizni davom ettirish uchun billing bo'limida rejani yangilang.\n\nXM Asistent jamoasi`,
        };
      case 'trial_ending_soon': {
        const days = extra?.['daysLeft'] ?? 3;
        return {
          subject: `${tenantName} — Trial ${days} kunda tugaydi`,
          text: `Hurmatli foydalanuvchi,\n\n${tenantName} akkauntingizning bepul sinov muddati ${days} kunda tugaydi.\nUzluksiz foydalanish uchun hoziroq rejangizni tanlang.\n\nXM Asistent jamoasi`,
        };
      }
      case 'payment_overdue':
        return {
          subject: `${tenantName} — To'lov muddati o'tdi`,
          text: `Hurmatli foydalanuvchi,\n\n${tenantName} akkauntingiz uchun to'lov muddati o'tdi va akkount to'xtatildi.\nTo'lovni amalga oshirib, akkauntingizni qayta faollashtiring.\n\nXM Asistent jamoasi`,
        };
      case 'payment_due_soon': {
        const amount = extra?.['amount'] ?? 0;
        const fmt = Number(amount).toLocaleString('uz-UZ');
        return {
          subject: `${tenantName} — To'lov 3 kunda`,
          text: `Hurmatli foydalanuvchi,\n\n${tenantName} akkauntingiz uchun ${fmt} so'm to'lov 3 kun ichida amalga oshirilishi kerak.\nBillingni o'z vaqtida ado eting.\n\nXM Asistent jamoasi`,
        };
      }
      default:
        return { subject: 'XM Asistent xabarnomasi', text: '' };
    }
  }
}
