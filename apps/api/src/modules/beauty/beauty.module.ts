import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeautyCatalog } from './entities/beauty-catalog.entity';
import { BeautyMaster } from './entities/beauty-master.entity';
import { BeautyAppointment } from './entities/beauty-appointment.entity';
import { BeautyService } from './beauty.service';
import { BeautyController } from './beauty.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BeautyCatalog, BeautyMaster, BeautyAppointment])],
  controllers: [BeautyController],
  providers: [BeautyService],
})
export class BeautyModule {}
