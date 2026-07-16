import {
  Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BugPriority, BugStatus, BugType } from './bug.entity';
import { BugsService } from './bugs.service';
import { CreateBugDto } from './dto/create-bug.dto';
import { UpdateBugDto } from './dto/update-bug.dto';

@Controller('bugs')
export class BugsController {
  constructor(private readonly bugsService: BugsService) {}

  /** Public — CRM reports bugs without auth */
  @Post()
  create(@Body() dto: CreateBugDto, @Req() req: { headers: Record<string, string> }) {
    if (!dto.type) {
      dto.type = BugType.USER_REPORT;
    }
    if (!dto.message && dto.title) {
      dto.message = dto.title;
    }
    if (!dto.message) {
      dto.message = 'Bug reported';
    }
    if (!dto.tenantId) {
      dto.tenantId = req.headers['x-tenant-id'] ?? undefined;
    }
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
    @Query('status')         status?:         BugStatus,
    @Query('tenantId')       tenantId?:       string,
    @Query('type')           type?:           BugType,
    @Query('priority')       priority?:       BugPriority,
    @Query('moduleAffected') moduleAffected?: string,
    @Query('from')           from?:           string,
    @Query('to')             to?:             string,
    @Query('page')           page?:           string,
    @Query('limit')          limit?:          string,
  ) {
    return this.bugsService.findAll({
      status,
      tenantId,
      type,
      priority,
      moduleAffected,
      from,
      to,
      page:  page  ? Number(page)  : undefined,
      limit: limit ? Number(limit) : undefined,
    });
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body('body') body: string,
    @Req() req: { user?: { email?: string } },
  ) {
    return this.bugsService.addComment(id, body, req.user?.email ?? 'admin');
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.bugsService.getComments(id);
  }
}
