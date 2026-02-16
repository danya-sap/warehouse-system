import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Создание товара
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: any) {
    return this.productsService.create(body);
  }

  // Получение всех товаров с пагинацией
  // Query параметры позволяют делать запросы типа /api/products?page=2&limit=5
@Get()
async findAll(
  @Query('page') page: string = '1',
  @Query('limit') limit: string = '10',
  @Query('search') search: string = '', // Добавь это!
) {
  return this.productsService.findAll(Number(page), Number(limit), search);
}

  // Получение одного товара по ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // Обновление товара
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.productsService.update(id, body);
  }

  // Удаление товара
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}