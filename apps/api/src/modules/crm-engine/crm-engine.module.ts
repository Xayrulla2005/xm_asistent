import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WizardModule } from '../wizard/wizard.module';
import { GeneratedCrm } from './entities/generated-crm.entity';
import { CrmEngineController } from './crm-engine.controller';
import { CrmEngineService } from './crm-engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([GeneratedCrm]), WizardModule],
  controllers: [CrmEngineController],
  providers: [CrmEngineService],
  exports: [CrmEngineService],
})
export class CrmEngineModule {}
