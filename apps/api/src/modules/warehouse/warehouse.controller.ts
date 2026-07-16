import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseLogDto } from './dto/create-warehouse-log.dto';
import { WarehouseLogType } from './entities/warehouse-log.entity';

@Controller('warehouse')
@UseGuards(JwtAuthGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  create(@CurrentUser() user: { tenantId: string }, @Body() dto: CreateWarehouseLogDto) {
    dto.tenantId = user.tenantId;
    return this.warehouseService.create(dto);
  }

  // /stats va /low-stock /:id dan oldin turishi kerak
  @Get('stats')
  getStats(@CurrentUser() user: { tenantId: string }) {
    return this.warehouseService.getStats(user.tenantId);
  }

  @Get('low-stock')
  getLowStock(@CurrentUser() user: { tenantId: string }) {
    return this.warehouseService.getLowStock(user.tenantId);
  }

  @Get()
  findAll(
    @CurrentUser() user: { tenantId: string },
    @Query('type') type?: WarehouseLogType,
  ) {
    return this.warehouseService.findAll(user.tenantId, type);
  }
}
