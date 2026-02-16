import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { OrdersModule } from './orders/orders.module';
import { CategoriesModule } from './categories/categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  // Мы убираем AppController и AppService, так как они нам не нужны для логики склада
  imports: [PrismaModule, AuthModule, ProductsModule, StockModule, OrdersModule, CategoriesModule, SuppliersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}