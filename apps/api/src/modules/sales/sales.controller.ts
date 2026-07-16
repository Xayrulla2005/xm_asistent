import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleStatusDto } from './dto/update-sale-status.dto';
import { SalesService } from './sales.service';
import { ReturnItem, ReturnStatus } from './entities/sale-return.entity';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: { tenantId: string }, @Body() dto: CreateSaleDto) {
    dto.tenantId = user.tenantId;
    return this.salesService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: { tenantId: string }) {
    return this.salesService.findAll(user.tenantId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats(@CurrentUser() user: { tenantId: string }) {
    return this.salesService.getStats(user.tenantId);
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  async exportExcel(
    @CurrentUser() user: { tenantId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const { buffer, filename } = await this.salesService.exportExcel(user.tenantId, from, to);
    res!.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res!.send(buffer);
  }

  // All returns for tenant (must be before :id routes)
  @Get('returns')
  @UseGuards(JwtAuthGuard)
  findAllReturns(@CurrentUser() user: { tenantId: string }) {
    return this.salesService.findAllReturns(user.tenantId);
  }

  @Patch('returns/:id')
  @UseGuards(JwtAuthGuard)
  updateReturnStatus(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: ReturnStatus },
  ) {
    return this.salesService.updateReturnStatus(id, body.status, user.tenantId);
  }

  // Public — chek havola UUID brute-force'ga chidamli
  @Get('receipt/:id')
  getReceipt(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.getReceipt(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.findOne(id, user.tenantId);
  }

  @Get(':id/returns')
  @UseGuards(JwtAuthGuard)
  findReturns(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.findReturns(id, user.tenantId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSaleStatusDto,
  ) {
    return this.salesService.updateStatus(id, dto, user.tenantId);
  }

  @Post(':id/return')
  @UseGuards(JwtAuthGuard)
  createReturn(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { items: ReturnItem[]; reason?: string },
  ) {
    return this.salesService.createReturn(id, body.items, body.reason, user.tenantId);
  }
}
