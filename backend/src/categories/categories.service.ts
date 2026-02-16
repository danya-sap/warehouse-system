import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(dto: { name: string }) {
    return this.prisma.category.create({ data: dto });
  }

  findAll() {
    return this.prisma.category.findMany({
      include: { _count: { select: { products: true } } } // Покажет кол-во товаров в категории
    });
  }

  remove(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}