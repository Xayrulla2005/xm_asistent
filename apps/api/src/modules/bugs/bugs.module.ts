import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bug } from './bug.entity';
import { BugComment } from './entities/bug-comment.entity';
import { BugsController } from './bugs.controller';
import { BugsService } from './bugs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bug, BugComment])],
  controllers: [BugsController],
  providers: [BugsService],
  exports: [BugsService],
})
export class BugsModule {}
