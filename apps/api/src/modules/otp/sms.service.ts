import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EskizAuthResponse {
  data: { token: string; tokenType: string };
  message: string;
}

@Injectable()
export class SmsService {
  private readonly log = new Logger(SmsService.name);
  private readonly BASE = 'https://notify.eskiz.uz/api';
  private readonly enabled: boolean;
  private readonly email: string;
  private readonly password: string;
  private readonly from: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;
  private readonly TOKEN_TTL_MS = 28 * 24 * 3600_000; // 28 days (Eskiz token lasts 29d)

  constructor(config: ConfigService) {
    this.email    = config.get<string>('ESKIZ_EMAIL')    ?? '';
    this.password = config.get<string>('ESKIZ_PASSWORD') ?? '';
    this.from     = config.get<string>('ESKIZ_FROM')     ?? '4546';
    this.enabled  = !!(this.email && this.password);

    if (!this.enabled) {
      this.log.warn('Eskiz SMS not configured — phone OTP will only log to console');
    }
  }

  async send(phone: string, message: string): Promise<boolean> {
    if (!this.enabled) {
      this.log.log(`[SMS-stub] → ${phone}: ${message}`);
      return false;
    }

    try {
      const token = await this.getToken();
      const normalized = this.normalizePhone(phone);

      const res = await fetch(`${this.BASE}/message/sms/send`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          mobile_phone: normalized,
          message,
          from:         this.from,
          callback_url: '',
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.log.error(`Eskiz send failed ${res.status}: ${body}`);
        // Token may be expired — invalidate cache and let next call refresh
        if (res.status === 401) this.cachedToken = null;
        return false;
      }

      this.log.log(`SMS sent to ${normalized}`);
      return true;
    } catch (err) {
      this.log.error(`SMS send error: ${err}`);
      return false;
    }
  }

  private async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const res = await fetch(`${this.BASE}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Eskiz auth failed ${res.status}: ${body}`);
    }

    const json = (await res.json()) as EskizAuthResponse;
    this.cachedToken    = json.data.token;
    this.tokenExpiresAt = Date.now() + this.TOKEN_TTL_MS;
    return this.cachedToken;
  }

  // Normalize to Uzbek format: 998901234567
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('998') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10)  return `998${digits.slice(1)}`;
    if (digits.length === 9)                              return `998${digits}`;
    return digits;
  }
}
