import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Добавь это!

@Module({
  imports: [PrismaModule], // И это!
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}