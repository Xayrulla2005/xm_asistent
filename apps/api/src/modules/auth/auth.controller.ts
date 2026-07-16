import { BadRequestException, Body, Controller, ForbiddenException, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
@Throttle({ default: { ttl: 60_000, limit: 20 } }) // auth endpoints: max 20/min per IP
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  refresh(@CurrentUser() user: User) {
    return this.authService.refresh(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleAuth(@Body() body: { token: string }) {
    return this.authService.googleAuth(body.token);
  }

  /** Login-only — returns 401 if user has no tenant (not registered yet) */
  @Post('google-login')
  @HttpCode(HttpStatus.OK)
  googleLogin(@Body() body: { token: string }) {
    return this.authService.googleLoginOnly(body.token);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: User,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  /**
   * One-time setup endpoint. Requires SUPERADMIN_SETUP_KEY env var to match
   * the setupKey in the request body. Disabled in production if the key is not set.
   */
  @Post('init-superadmin')
  @HttpCode(HttpStatus.CREATED)
  @SkipThrottle()
  initSuperadmin(@Body() body: { email: string; password: string; setupKey: string }) {
    const required = process.env['SUPERADMIN_SETUP_KEY'];
    if (!required) throw new ForbiddenException('Setup endpoint is disabled');
    if (body.setupKey !== required) throw new ForbiddenException('Invalid setup key');
    if (!body.email || !body.password) throw new BadRequestException('email va password majburiy');
    return this.authService.createSuperadmin(body.email, body.password);
  }

}
