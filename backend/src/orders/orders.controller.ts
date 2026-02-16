import { Controller, Post, Get, Body, UseGuards, Req, Param, Delete, Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  // Используем встроенный логгер NestJS для красивого вывода в терминал
  private readonly logger = new Logger('OrdersController');

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: any, @Req() req: any) {
    return this.ordersService.createOrder(req.user.userId, dto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Post(':id/complete')
  @Roles(Role.ADMIN, Role.WAREHOUSE_WORKER)
  async complete(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`📦 Отгрузка заказа ${id} начата пользователем ${req.user.email || req.user.userId}`);
    return this.ordersService.completeOrder(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  async remove(@Param('id') id: string, @Req() req: any) {
    // Вычисляем, кто делает запрос
    const issuer = req.user.email || req.user.userId;
    
    // Выводим яркий лог в консоль сервера
    this.logger.warn(`🗑️ ОТМЕНА ЗАКАЗА: ID ${id}. Инициатор: ${issuer}`);
    
    return this.ordersService.remove(id);
  }
}