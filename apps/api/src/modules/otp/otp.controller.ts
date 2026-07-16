import { BadRequestException, Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpService } from './otp.service';
import { User } from '../auth/entities/user.entity';

interface SendEmailBody { email: string }
interface VerifyBody    { email: string; code: string }

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
    // Email allaqachon ro'yxatdan o'tganmi?
    const existing = await this.userRepo.findOne({ where: { email: body.email } });
    if (existing) {
      throw new BadRequestException(
        'Bu email allaqachon ro\'yxatdan o\'tgan. Kirish sahifasiga o\'ting.',
      );
    }

    // Lockout tekshirish
    const lock = this.otp.checkLockout(body.email);
    if (lock.locked) {
      throw new BadRequestException(
        `Juda ko'p noto'g'ri urinish. ${lock.minutesLeft} daqiqadan keyin qayta urinib ko'ring.`,
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
    // Note: code is always logged in server console by sendEmailOtp
  }

  @Post('verify')
  @HttpCode(200)
  verify(@Body() body: VerifyBody) {
    const result = this.otp.verifyOtp(body.email, body.code);
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
    await this.otp.sendPhoneOtp(body.phone);
    return { success: true };
  }

  @Post('verify-phone')
  @HttpCode(200)
  verifyPhone(@Body() body: { phone: string; code: string }) {
    return this.otp.verifyPhoneOtp(body.phone, body.code);
  }

}
