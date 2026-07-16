import {
  Body,
  Controller,
  Delete,
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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@CurrentUser() user: { tenantId: string }, @Body() dto: CreateCustomerDto) {
    dto.tenantId = user.tenantId;
    return this.customersService.create(dto);
  }

  @Get()
  findAll(@CurrentUser() user: { tenantId: string }) {
    return this.customersService.findAll(user.tenantId);
  }

  @Get('export')
  async exportExcel(
    @CurrentUser() user: { tenantId: string },
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.customersService.exportExcel(user.tenantId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customersService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customersService.remove(id, user.tenantId);
  }
}
