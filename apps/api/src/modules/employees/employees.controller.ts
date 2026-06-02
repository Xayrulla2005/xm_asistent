import {
  Body, Controller, Delete, Get,
  Headers, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  private tid(user: any, header: string): string {
    return user.tenantId ?? header;
  }

  @Post()
  create(
    @CurrentUser() user: any,
    @Headers('x-tenant-id') tenantHeader: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.service.create(this.tid(user, tenantHeader), dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Headers('x-tenant-id') tenantHeader: string,
  ) {
    return this.service.findAll(this.tid(user, tenantHeader));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: any,
    @Headers('x-tenant-id') tenantHeader: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(this.tid(user, tenantHeader), id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Headers('x-tenant-id') tenantHeader: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.service.update(this.tid(user, tenantHeader), id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: any,
    @Headers('x-tenant-id') tenantHeader: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deactivate(this.tid(user, tenantHeader), id);
  }
}
