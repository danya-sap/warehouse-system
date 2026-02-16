import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service'; // проверь путь
import * as bcrypt from 'bcrypt';

@Controller('api')
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('seed')
  async seed() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // 1. Админ
    await this.prisma.user.upsert({
      where: { email: 'superadmin@warehouse.com' },
      update: {},
      create: {
        email: 'superadmin@warehouse.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    // 2. Категории
    const categories = ['Электроника', 'Инструменты', 'Расходные материалы'];
    for (const name of categories) {
      await this.prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    }

    // 3. Поставщики
    const suppliers = [
      { name: 'ООО ТехноМир', contact: 'sales@technomir.com' },
      { name: 'Инструмент-Опт', contact: '+7 (999) 123-45-67' }
    ];
    for (const s of suppliers) {
      await this.prisma.supplier.upsert({ where: { name: s.name }, update: {}, create: s });
    }

    return { message: '✅ База данных успешно заполнена!' };
  }
}