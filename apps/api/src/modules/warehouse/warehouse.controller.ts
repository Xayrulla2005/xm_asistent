import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseLogDto } from './dto/create-warehouse-log.dto';
import { WarehouseLogType } from './entities/warehouse-log.entity';

@Controller('warehouse')
@UseGuards(JwtAuthGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  create(@Body() dto: CreateWarehouseLogDto) {
    return this.warehouseService.create(dto);
  }

  // /stats va /low-stock /:id dan oldin turishi kerak
  @Get('stats')
  getStats(@Query('tenantId') tenantId?: string) {
    return this.warehouseService.getStats(tenantId);
  }

  @Get('low-stock')
  getLowStock(@Query('tenantId') tenantId?: string) {
    return this.warehouseService.getLowStock(tenantId);
  }

  @Get()
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('type')     type?: WarehouseLogType,
  ) {
    return this.warehouseService.findAll(tenantId, type);
  }
}
