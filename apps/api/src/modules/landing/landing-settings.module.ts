import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingSettings } from './landing-settings.entity';
import { LandingSettingsController } from './landing-settings.controller';
import { LandingSettingsService } from './landing-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([LandingSettings])],
  controllers: [LandingSettingsController],
  providers: [LandingSettingsService],
})
export class LandingSettingsModule {}
