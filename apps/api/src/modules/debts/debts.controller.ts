import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DebtsService } from './debts.service';

@Controller('debts')
@UseGuards(JwtAuthGuard)
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Get()
  findAll(
    @CurrentUser() user: { tenantId: string },
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
  ) {
    return this.debtsService.findAll(user.tenantId, customerId, status);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: { tenantId: string }) {
    return this.debtsService.getSummary(user.tenantId);
  }

  @Patch(':id/pay')
  recordPayment(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { amount: number; notes?: string },
  ) {
    return this.debtsService.recordPayment(id, body.amount, user.tenantId, body.notes);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.debtsService.cancel(id, user.tenantId);
  }
}
