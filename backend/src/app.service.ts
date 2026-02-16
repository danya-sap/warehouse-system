import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service'; // Проверь путь к сервису
import * as bcrypt from 'bcrypt';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  async seedAdmin() {
    const adminEmail = 'superadmin@warehouse.com';
    const hashedPassword = await bcrypt.hash('admin123', 10);

    try {
      await this.prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log('✅ [Seed] Супер-админ готов к работе: superadmin@warehouse.com');
    } catch (error) {
      console.error('❌ [Seed] Ошибка при создании админа:', error);
    }
  }

  getHello(): string {
    return 'Warehouse System API is running';
  }
} 