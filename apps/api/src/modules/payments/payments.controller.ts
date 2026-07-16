import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentMethod, PaymentStatus } from './entities/payment.entity';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@CurrentUser() user: { tenantId: string }, @Body() dto: CreatePaymentDto) {
    dto.tenantId = user.tenantId;
    return this.paymentsService.create(dto);
  }

  // /stats oldin turishi kerak — /:id dan oldin
  @Get('stats')
  getStats(@CurrentUser() user: { tenantId: string }) {
    return this.paymentsService.getStats(user.tenantId);
  }

  @Get()
  findAll(
    @CurrentUser() user: { tenantId: string },
    @Query('status')   status?: PaymentStatus,
    @Query('method')   method?: PaymentMethod,
  ) {
    return this.paymentsService.findAll(user.tenantId, status, method);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.findOne(id, user.tenantId);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: { tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updateStatus(id, dto, user.tenantId);
  }
}
