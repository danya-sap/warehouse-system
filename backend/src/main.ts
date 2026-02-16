import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const prisma = app.get(PrismaService);

  // Список пользователей для сида
  const testUsers = [
    {
      email: 'superadmin@warehouse.com',
      password: 'admin123',
      role: 'ADMIN' as const,
    },
    {
      email: 'manager@warehouse.com',
      password: 'password123',
      role: 'MANAGER' as const,
    },
    {
      email: 'worker@warehouse.com',
      password: 'password123',
      role: 'WAREHOUSE_WORKER' as const,
    },
  ];

  // Список поставщиков для сида
const testSuppliers = [
    { 
      name: 'ООО ТехноМир', 
      contact: 'ivan@techno.ru' 
    },
    { 
      name: 'Инструмент-Опт', 
      contact: 'sale@tools.ru' 
    },
    { 
      name: 'Глобал Логистик', 
      contact: 'office@global.com' 
    },
  ];
  console.log('🚀 [System] Проверка базы данных...');

  // 1. Создаем/обновляем пользователей
  for (const user of testUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    await prisma.user.upsert({
      where: { email: user.email },
      update: {}, // Если пользователь есть, пароль не перезаписываем (чтобы не грузить хеширование)
      create: {
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    });
    console.log(`✅ [Seed] Пользователь готов: ${user.email} (${user.role})`);
  }

  // 2. Создаем/обновляем поставщиков
for (const supplier of testSuppliers) {
    await prisma.supplier.upsert({
      where: { name: supplier.name },
      update: {
        contact: supplier.contact,
      },
      create: supplier,
    });
    console.log(`📦 [Seed] Поставщик готов: ${supplier.name}`);
  }

  await app.listen(3000);
  console.log('---');
  console.log('📡 [Server] WMS Backend запущен на http://localhost:3000');
  console.log('💡 [Tip] Теперь в модалке приемки появятся поставщики!');
}
bootstrap();