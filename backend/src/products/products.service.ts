import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // CREATE: Создание товара
  async create(data: any) {
    return this.prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        price: Number(data.price || 0),
        unit: data.unit || 'шт',
        description: data.description,
        category: {
          connectOrCreate: {
            where: { name: data.categoryName || 'Общее' },
            create: { name: data.categoryName || 'Общее' }
          }
        }
      },
      include: { category: true }
    });
  }

async findAll(page: number = 1, limit: number = 10, search: string = '') {
  const skip = (page - 1) * limit;

  // Формируем фильтр
  const where = {
    isArchived: false, // <-- ГЛАВНОЕ: показываем только неархивные
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { sku: { contains: search, mode: 'insensitive' as const } }
      ]
    })
  };

  const [products, totalCount] = await Promise.all([
    this.prisma.product.findMany({
      where, // Применяем фильтр здесь
      skip,
      take: limit,
      include: {
        category: true,
        stock: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.product.count({ where }), // И здесь для правильного счетчика страниц
  ]);

  // Маппинг данных (остается как был)
  const data = products.map(product => ({
    ...product,
    totalStock: product.stock?.reduce((sum, item) => sum + item.quantity, 0) || 0,
  }));

  return { data, meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) } };
}

  // READ: Поиск одного товара
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, stock: true }
    });

    if (!product) throw new NotFoundException('Товар не найден');

    return {
      ...product,
      totalStock: product.stock?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    };
  }

  // UPDATE: Обновление
  async update(id: string, data: any) {
    return this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        sku: data.sku,
        price: data.price ? Number(data.price) : undefined,
        unit: data.unit,
        description: data.description,
        ...(data.categoryName && {
          category: {
            connectOrCreate: {
              where: { name: data.categoryName },
              create: { name: data.categoryName }
            }
          }
        })
      },
      include: { category: true }
    });
  }

  async remove(id: string) {
  // Просто меняем флаг, физически строка остается в БД
  return await this.prisma.product.update({
    where: { id },
    data: { 
      isArchived: true 
    },
  });
}
}