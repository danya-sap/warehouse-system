# Этап 1: Сборка приложения
FROM node:20-alpine AS build

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы и собираем проект
COPY . .
RUN npm run build

# Этап 2: Раздача статики через Nginx
FROM nginx:stable-alpine

# Копируем собранные файлы из первого этапа в папку Nginx
# По умолчанию Vite собирает проект в папку 'dist'
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем кастомный конфиг Nginx (опционально, см. ниже)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]