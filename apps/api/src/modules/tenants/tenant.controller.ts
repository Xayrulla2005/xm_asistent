import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { User, UserRole } from '../auth/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OtpService } from '../otp/otp.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantService } from './tenant.service';

interface RegisterBody {
  email?:       string;
  phone?:       string;
  googleToken?: string;
  firstName?:   string;
  password?:    string;
}

@Controller('tenants')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly authService:   AuthService,
    private readonly otpService:    OtpService,
  ) {}

  /** Public — no JWT guard. */
  @Post('register')
  async register(@Body() body: RegisterBody) {
    if (!body.email && !body.phone && !body.googleToken) {
      throw new BadRequestException('Email, telefon yoki Google kiritilishi shart');
    }

    // ── Google OAuth flow ──────────────────────────────────────────────────────
    if (body.googleToken) {
      const google = await this.authService.googleAuth(body.googleToken, body.password);

      const existingUser = await this.authService.getUserById(google.user.id);
      if (existingUser?.tenantId) {
        // Already registered — reissue tokens but signal frontend to skip wizard
        const tokens = await this.authService.reissueForUser(existingUser.id);
        return {
          tenantId:       existingUser.tenantId,
          userId:         existingUser.id,
          isExistingUser: true,
          ...tokens,
        };
      }

      const name   = (google.firstName?.trim() || google.email.split('@')[0]).substring(0, 80);
      const tenant = await this.tenantService.create({ name, ownerId: google.user.id });
      await this.authService.setUserTenant(google.user.id, tenant.id);
      const tokens = await this.authService.reissueForUser(google.user.id);
      return { tenantId: tenant.id, userId: google.user.id, isExistingUser: false, ...tokens };
    }

    // ── Email / Phone flow (requires OTP) ──────────────────────────────────────
    if (!body.password) {
      throw new BadRequestException('Parol kiritilishi shart');
    }

    let userEmail: string;
    let tenantName: string;

    if (body.email) {
      if (!this.otpService.isEmailVerified(body.email)) {
        throw new BadRequestException('Email tasdiqlanmagan. Avval OTP kodni kiriting.');
      }
      userEmail  = body.email;
      tenantName = body.email.split('@')[0];
    } else {
      const phone = body.phone!;
      if (!this.otpService.isPhoneVerified(phone)) {
        throw new BadRequestException('Telefon tasdiqlanmagan. Avval OTP kodni kiriting.');
      }
      userEmail  = `p${phone.replace(/\D/g, '')}@phone.local`;
      tenantName = phone;
    }

    const auth = await this.authService.register({
      email:    userEmail,
      password: body.password,
      role:     UserRole.ADMIN,
    });
    const tenant = await this.tenantService.create({ name: tenantName, ownerId: auth.user.id });

    // Link user → tenant and reissue token so tenantId is inside JWT
    await this.authService.setUserTenant(auth.user.id, tenant.id);
    const tokens = await this.authService.reissueForUser(auth.user.id);

    if (body.email) {
      this.otpService.clearVerified(body.email);
    } else {
      this.otpService.clearVerifiedPhone(body.phone!);
    }

    return {
      tenantId:     tenant.id,
      userId:       auth.user.id,
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  /**
   * Creates a new tenant for the currently logged-in user who has no tenant yet.
   * Used when a user's CRM was deleted and they need to create a new workspace.
   */
  @Post('new-workspace')
  @UseGuards(JwtAuthGuard)
  async newWorkspace(@Req() req: { user: User }) {
    const user = req.user;
    if (user.tenantId) {
      throw new ConflictException('Sizda allaqachon aktiv CRM mavjud');
    }
    const name   = user.email.split('@')[0];
    const tenant = await this.tenantService.create({ name, ownerId: user.id });
    await this.authService.setUserTenant(user.id, tenant.id);
    const tokens = await this.authService.reissueForUser(user.id);
    return { tenantId: tenant.id, ...tokens };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: { role?: string }) {
    if (user.role !== 'superadmin') throw new ForbiddenException('Faqat superadmin uchun');
    return this.tenantService.findAll();
  }

  /** Public — no JWT guard. Returns minimal safe tenant list for login portal. */
  @Get('public')
  findPublic() {
    return this.tenantService.findPublic();
  }

  /** Public — resolves a tenant slug to its id/name for subdomain-based routing. */
  @Get('public/by-slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.tenantService.findBySlug(slug);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @CurrentUser() user: { role?: string; tenantId?: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (user.role !== 'superadmin' && user.tenantId !== id) {
      throw new ForbiddenException('Bu tenant ma\'lumotlariga kirishga ruxsat yo\'q');
    }
    return this.tenantService.findOneRich(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: { role?: string; tenantId?: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    if (user.role !== 'superadmin' && user.tenantId !== id) {
      throw new ForbiddenException('Bu tenant ni o\'zgartirish ruxsat yo\'q');
    }
    return this.tenantService.update(id, dto);
  }

  @Post(':id/impersonate')
  @UseGuards(JwtAuthGuard)
  async impersonate(
    @CurrentUser() user: { role?: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (user.role !== 'superadmin') throw new ForbiddenException('Faqat superadmin uchun');
    const tenant = await this.tenantService.findOne(id);
    const result = await this.authService.generateImpersonateToken(tenant.ownerId, tenant.id);
    return { ...result, slug: tenant.slug, tenantId: tenant.id };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: { role?: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (user.role !== 'superadmin') throw new ForbiddenException('Faqat superadmin o\'chira oladi');
    return this.tenantService.remove(id);
  }
}
