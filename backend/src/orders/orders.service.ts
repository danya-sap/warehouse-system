import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // 1. СОЗДАНИЕ ЗАКАЗА (Мягкий резерв)
  async createOrder(userId: string, dto: { customer: string; items: { productId: string; quantity: number }[] }) {
    return this.prisma.$transaction(async (tx) => {
      
      // Проверяем наличие каждого товара
      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) throw new BadRequestException(`Товар не найден`);

        // Считаем актуальный остаток по всем партиям на складе
        const stockSum = await tx.stock.aggregate({
          where: { productId: item.productId },
          _sum: { quantity: true }
        });

        const totalAvailable = stockSum._sum.quantity || 0;

        if (totalAvailable < item.quantity) {
          throw new BadRequestException(
            `Недостаточно товара "${product.name}". В наличии: ${totalAvailable}, требуется: ${item.quantity}`
          );
        }
      }

      // Создаем заказ
      const order = await tx.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}`,
          customer: dto.customer,
          status: "NEW",
          user: { connect: { id: userId } },
          items: {
            create: dto.items.map(item => ({
              quantity: item.quantity,
              price: 0,
              product: { connect: { id: item.productId } }
            }))
          }
        },
        include: { items: { include: { product: true } } }
      });

      return order;
    });
  }

  // 2. ОТГРУЗКА (Списание по FIFO)
  async completeOrder(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order || order.status !== 'NEW') {
        throw new BadRequestException('Заказ не найден или уже обработан');
      }

      for (const item of order.items) {
        let remaining = item.quantity;

        const stocks = await tx.stock.findMany({
          where: { productId: item.productId, quantity: { gt: 0 } },
          orderBy: { receivedAt: 'asc' },
        });

        for (const stock of stocks) {
          if (remaining <= 0) break;
          const take = Math.min(stock.quantity, remaining);
          
          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: stock.quantity - take },
          });
          remaining -= take;
        }

        if (remaining > 0) throw new BadRequestException('Недостаточно товара на складе для полной отгрузки');
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED' },
        include: { items: { include: { product: true } } }
      });
    });
  }

  // 3. ОТМЕНА ЗАКАЗА (Удаление)
  async remove(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    // Критическая проверка: нельзя удалять то, что уже списано со склада
    if (order.status === 'COMPLETED') {
      throw new BadRequestException('Нельзя отменить заказ, который уже отгружен');
    }

    return this.prisma.$transaction(async (tx) => {
      // Сначала удаляем позиции заказа (OrderItem)
      await tx.orderItem.deleteMany({
        where: { orderId: orderId },
      });

      // Затем удаляем сам заказ
      return tx.order.delete({
        where: { id: orderId },
      });
    });
  }

  // 4. ПОЛУЧЕНИЕ ВСЕХ ЗАКАЗОВ
  async findAll() {
    return this.prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}