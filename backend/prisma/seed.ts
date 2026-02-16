import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv'; // Добавили импорт

dotenv.config(); // Загрузили переменные из .env

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // 1. Создаем Супер-админа
  await prisma.user.upsert({
    where: { email: 'superadmin@warehouse.com' },
    update: {},
    create: {
      email: 'superadmin@warehouse.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Супер-админ создан: superadmin@warehouse.com / admin123');

  // 2. Создаем базовые Категории (обязательно для CRUD товаров)
  const categories = ['Электроника', 'Инструменты', 'Расходные материалы'];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('✅ Базовые категории созданы');

  // 3. Создаем базовых Поставщиков (обязательно для прихода товара)
  const suppliers = [
    { name: 'ООО ТехноМир', contact: 'sales@technomir.com' },
    { name: 'Инструмент-Опт', contact: '+7 (999) 123-45-67' }
  ];
  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { name: s.name },
      update: {},
      create: { name: s.name, contact: s.contact },
    });
  }
  console.log('✅ Базовые поставщики созданы');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });