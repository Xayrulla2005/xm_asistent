import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { RestaurantService } from './restaurant.service';

function tid(u: User): string { return (u as unknown as { tenantId: string }).tenantId; }

@Controller('restaurant')
@UseGuards(JwtAuthGuard)
export class RestaurantController {
  constructor(private readonly svc: RestaurantService) {}

  // Menu
  @Get('menu')
  getMenu(@CurrentUser() u: User, @Query('search') search?: string, @Query('category') category?: string) {
    return this.svc.findMenu(tid(u), search, category);
  }
  @Post('menu')
  createMenuItem(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) { return this.svc.createMenuItem(tid(u), dto as never); }
  @Put('menu/:id')
  updateMenuItem(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) { return this.svc.updateMenuItem(tid(u), id, dto as never); }
  @Delete('menu/:id')
  removeMenuItem(@CurrentUser() u: User, @Param('id') id: string) { return this.svc.removeMenuItem(tid(u), id); }

  // Tables
  @Get('tables')
  getTables(@CurrentUser() u: User) { return this.svc.findTables(tid(u)); }
  @Post('tables')
  createTable(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) { return this.svc.createTable(tid(u), dto as never); }
  @Put('tables/:id')
  updateTable(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) { return this.svc.updateTable(tid(u), id, dto as never); }
  @Delete('tables/:id')
  removeTable(@CurrentUser() u: User, @Param('id') id: string) { return this.svc.removeTable(tid(u), id); }

  // Orders
  @Get('orders')
  getOrders(@CurrentUser() u: User, @Query('status') status?: string) { return this.svc.findOrders(tid(u), status); }
  @Get('orders/kitchen')
  getKitchenOrders(@CurrentUser() u: User) { return this.svc.findKitchenOrders(tid(u)); }
  @Get('orders/stats')
  getOrderStats(@CurrentUser() u: User) { return this.svc.getOrderStats(tid(u)); }
  @Get('orders/:id')
  getOrder(@CurrentUser() u: User, @Param('id') id: string) { return this.svc.findOrderById(tid(u), id); }
  @Post('orders')
  createOrder(@CurrentUser() u: User, @Body() dto: Record<string, unknown>) { return this.svc.createOrder(tid(u), dto as never); }
  @Put('orders/:id')
  updateOrder(@CurrentUser() u: User, @Param('id') id: string, @Body() dto: Record<string, unknown>) { return this.svc.updateOrder(tid(u), id, dto as never); }
  @Delete('orders/:id')
  removeOrder(@CurrentUser() u: User, @Param('id') id: string) { return this.svc.removeOrder(tid(u), id); }
}
