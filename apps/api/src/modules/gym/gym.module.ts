import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymMember } from './entities/gym-member.entity';
import { GymPlan } from './entities/gym-plan.entity';
import { GymCheckIn } from './entities/gym-checkin.entity';
import { GymService } from './gym.service';
import { GymController } from './gym.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GymMember, GymPlan, GymCheckIn])],
  controllers: [GymController],
  providers: [GymService],
})
export class GymModule {}
