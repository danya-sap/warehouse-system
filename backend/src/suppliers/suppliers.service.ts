import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  // Внедряем PrismaService, чтобы иметь доступ к базе данных
  constructor(private prisma: PrismaService) {}

  // Создание поставщика
  async create(dto: { name: string; contact?: string }) {
    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        contact: dto.contact,
      },
    });
  }

  // Получение всех поставщиков
  async findAll() {
    return this.prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Получение одного по ID
  async findOne(id: string) {
    return this.prisma.supplier.findUnique({
      where: { id },
    });
  }

  // Удаление поставщика
  async remove(id: string) {
    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}