import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // 1. ПОЛУЧИТЬ ВСЕ ОСТАТКИ (Добавили этот метод)
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.stockService.findAll();
  }

  // 2. ПРИЁМКА
  @UseGuards(JwtAuthGuard)
  @Post('receive')
  async receive(@Body() body: any) {
    return this.stockService.receiveGoods(body);
  }

  // 3. СПИСАНИЕ
  @UseGuards(JwtAuthGuard)
  @Post('dispatch')
  async dispatch(@Body() body: { productId: string; quantity: number }) {
    return this.stockService.removeGoods(body.productId, body.quantity);
  }

  // 4. ОСТАТКИ ПО КОНКРЕТНОМУ ТОВАРУ
  @UseGuards(JwtAuthGuard) // Добавил защиту и сюда для безопасности
  @Get('product/:id')
  async getByProduct(@Param('id') id: string) {
    return this.stockService.getProductStock(id);
  }
}