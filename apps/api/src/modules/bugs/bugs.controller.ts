import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BugStatus, BugType } from './bug.entity';
import { BugsService } from './bugs.service';
import { CreateBugDto } from './dto/create-bug.dto';
import { UpdateBugDto } from './dto/update-bug.dto';

@Controller('bugs')
export class BugsController {
  constructor(private readonly bugsService: BugsService) {}

  // Public — CRM reports bugs without auth
  @Post()
  create(@Body() dto: CreateBugDto) {
    return this.bugsService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getStats() {
    return this.bugsService.getStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('status')   status?:   BugStatus,
    @Query('tenantId') tenantId?: string,
    @Query('type')     type?:     BugType,
  ) {
    return this.bugsService.findAll({ status, tenantId, type });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bugsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBugDto) {
    return this.bugsService.update(id, dto);
  }
}
