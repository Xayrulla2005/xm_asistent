import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WizardConfig } from './entities/wizard-config.entity';
import { WizardController } from './wizard.controller';
import { WizardService } from './wizard.service';

@Module({
  imports: [TypeOrmModule.forFeature([WizardConfig])],
  controllers: [WizardController],
  providers: [WizardService],
  exports: [WizardService],
})
export class WizardModule {}
