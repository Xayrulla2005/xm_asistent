import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { RestTable } from './entities/table.entity';
import { RestOrder } from './entities/order.entity';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem, RestTable, RestOrder])],
  controllers: [RestaurantController],
  providers: [RestaurantService],
})
export class RestaurantModule {}
