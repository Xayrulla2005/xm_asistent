import { BadRequestException, Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpService } from './otp.service';
import { User } from '../auth/entities/user.entity';

interface SendEmailBody { email: string }
interface VerifyBody    { email: string; code: string }

// OTP endpoints: max 3 per minute per IP — brute-force OTP guessing prevention
@Throttle({ default: { ttl: 60_000, limit: 3 } })
@Controller('otp')
export class OtpController {
  private readonly logger = new Logger(OtpController.name);

  constructor(
    private readonly otp: OtpService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Email OTP ─────────────────────────────────────────────────────────────

  @Post('send-email')
  @HttpCode(200)
  async sendEmail(@Body() body: SendEmailBody) {
    const existing = await this.userRepo.findOne({ where: { email: body.email } });
    if (existing) {
      throw new BadRequestException(
        "Bu email allaqachon ro'yxatdan o'tgan. Kirish sahifasiga o'ting.",
      );
    }

    let gmailError: string | null = null;
    try {
      await this.otp.sendEmailOtp(body.email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('LOCKED:')) {
        const mins = msg.split(':')[1];
        throw new BadRequestException(`${mins} daqiqadan keyin qayta urinib ko'ring.`);
      }
      gmailError = msg;
      this.logger.error(`[OTP] Gmail failed: ${gmailError} — code is in server console`);
    }

    return { success: true, gmailError };
  }

  @Post('verify')
  @HttpCode(200)
  async verify(@Body() body: VerifyBody) {
    const result = await this.otp.verifyOtp(body.email, body.code);
    if (result.lockedMinutes) {
      throw new BadRequestException(
        `${result.lockedMinutes} daqiqadan keyin qayta urinib ko'ring.`,
      );
    }
    return result;
  }

  // ── Phone OTP ─────────────────────────────────────────────────────────────

  @Post('send-phone')
  @HttpCode(200)
  async sendPhone(@Body() body: { phone: string }) {
    try {
      await this.otp.sendPhoneOtp(body.phone);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('LOCKED:')) {
        const mins = msg.split(':')[1];
        throw new BadRequestException(`${mins} daqiqadan keyin qayta urinib ko'ring.`);
      }
    }
    return { success: true };
  }

  @Post('verify-phone')
  @HttpCode(200)
  async verifyPhone(@Body() body: { phone: string; code: string }) {
    const result = await this.otp.verifyPhoneOtp(body.phone, body.code);
    if (result.lockedMinutes) {
      throw new BadRequestException(
        `${result.lockedMinutes} daqiqadan keyin qayta urinib ko'ring.`,
      );
    }
    return result;
  }

}
