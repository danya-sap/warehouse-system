import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Импортируем PrismaModule

@Module({
  imports: [PrismaModule], // Добавляем PrismaModule в импорты
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}