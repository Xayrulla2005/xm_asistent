import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
  Req, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';

type AuthReq = { user?: { email?: string } };

@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly svc: BranchesService) {}

  // ── Branches CRUD ──────────────────────────────────────────────────────────

  @Post()
  create(@CurrentUser() user: { tenantId: string }, @Body() dto: CreateBranchDto) {
    return this.svc.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { tenantId: string }) {
    return this.svc.findAll(user.tenantId);
  }

  @Get('stats')
  getStats(@CurrentUser() user: { tenantId: string }) {
    return this.svc.getStats(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.svc.findOne(user.tenantId, id);
  }

  @Get(':id/inventory')
  getInventory(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.svc.getBranchInventory(user.tenantId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: { tenantId: string }, @Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.svc.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.svc.remove(user.tenantId, id);
  }

  // ── Transfers ──────────────────────────────────────────────────────────────

  @Post('transfers')
  createTransfer(
    @CurrentUser() user: { tenantId: string; email?: string },
    @Req() req: AuthReq,
    @Body() dto: CreateTransferDto,
  ) {
    return this.svc.createTransfer(user.tenantId, dto, req.user?.email);
  }

  @Get('transfers/list')
  getTransfers(
    @CurrentUser() user: { tenantId: string },
    @Query('branchId') branchId?: string,
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
  ) {
    return this.svc.getTransfers(user.tenantId, {
      branchId,
      page:  page  ? Number(page)  : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
