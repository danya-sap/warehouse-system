import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Импортируем

@Module({
  imports: [PrismaModule], // Добавляем сюда
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}