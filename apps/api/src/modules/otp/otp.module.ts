import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { User } from '../auth/entities/user.entity';
import { OtpRecord } from './entities/otp-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, OtpRecord])],
  controllers: [OtpController],
  providers:   [OtpService],
  exports:     [OtpService],
})
export class OtpModule {}
