import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() dto: { name: string; contact?: string }) {
    return this.suppliersService.create(dto);
  }

  @Get()
  findAll() {
    return this.suppliersService.findAll();
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
