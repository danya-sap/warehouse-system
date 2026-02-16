import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  // 1. ПОЛУЧИТЬ ВСЕ АКТУАЛЬНЫЕ ОСТАТКИ (Для общей таблицы/дашборда)
  async findAll() {
    return this.prisma.stock.findMany({
      where: {
        // Показываем остатки только для тех товаров, которые НЕ в архиве
        product: {
          isArchived: false,
        },
        // Опционально: показывать только те партии, где количество > 0
        quantity: { gt: 0 },
      },
      include: {
        product: {
          include: {
            category: true, // Подтягиваем категорию для красоты в таблице
          },
        },
        supplier: true,
      },
      orderBy: { receivedAt: 'desc' },
    });
  }

  // 2. ПРИЁМКА НОВОЙ ПАРТИИ ТОВАРА
  async receiveGoods(data: any) {
    if (!data.supplierId) {
      throw new BadRequestException('Необходимо указать ID поставщика');
    }

    // Проверяем, не пытаемся ли мы принять товар, который в архиве
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product || product.isArchived) {
      throw new BadRequestException('Нельзя принять товар, который находится в архиве');
    }

    return this.prisma.stock.create({
      data: {
        productId: data.productId,
        quantity: Number(data.quantity),
        initialQuantity: Number(data.quantity),
        price: Number(data.price || data.purchasePrice || 0),
        supplierId: data.supplierId,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
      include: {
        product: true,
        supplier: true,
      },
    });
  }

  // 3. СПИСАНИЕ ТОВАРА (FIFO)
  async removeGoods(productId: string, quantityToRemove: number) {
    return this.prisma.$transaction(async (tx) => {
      // Ищем партии только неархивного товара
      const stocks = await tx.stock.findMany({
        where: {
          productId: productId,
          quantity: { gt: 0 },
          product: { isArchived: false },
        },
        orderBy: { receivedAt: 'asc' }, // FIFO
      });

      let remainingToReduce = quantityToRemove;

      for (const batch of stocks) {
        if (remainingToReduce <= 0) break;

        const reduceAmount = Math.min(batch.quantity, remainingToReduce);

        await tx.stock.update({
          where: { id: batch.id },
          data: { quantity: batch.quantity - reduceAmount },
        });

        remainingToReduce -= reduceAmount;
      }

      if (remainingToReduce > 0) {
        throw new BadRequestException(
          `Недостаточно товара или товар в архиве! Не хватило: ${remainingToReduce}`,
        );
      }

      return { message: 'Списание прошло успешно', reduced: quantityToRemove };
    });
  }

  // 4. ПОСМОТРЕТЬ ОСТАТКИ ПО КОНКРЕТНОМУ ТОВАРУ
  async getProductStock(productId: string) {
    return this.prisma.stock.findMany({
      where: {
        productId,
        product: { isArchived: false }, // Фильтр архива
      },
      include: { supplier: true },
      orderBy: { receivedAt: 'desc' },
    });
  }
}