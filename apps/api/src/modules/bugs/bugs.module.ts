import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bug } from './bug.entity';
import { BugsController } from './bugs.controller';
import { BugsService } from './bugs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bug])],
  controllers: [BugsController],
  providers: [BugsService],
})
export class BugsModule {}
