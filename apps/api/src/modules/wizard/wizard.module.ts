import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { WizardConfig } from './entities/wizard-config.entity';
import { WizardController } from './wizard.controller';
import { WizardPublicController } from './wizard-public.controller';
import { WizardService } from './wizard.service';

@Module({
  imports: [TypeOrmModule.forFeature([WizardConfig, Employee])],
  controllers: [WizardController, WizardPublicController],
  providers:   [WizardService],
  exports:     [WizardService],
})
export class WizardModule {}
