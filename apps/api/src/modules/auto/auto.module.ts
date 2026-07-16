import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoVehicle } from './entities/auto-vehicle.entity';
import { AutoServiceOrder } from './entities/auto-service-order.entity';
import { AutoService } from './auto.service';
import { AutoController } from './auto.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AutoVehicle, AutoServiceOrder])],
  controllers: [AutoController],
  providers: [AutoService],
})
export class AutoModule {}
