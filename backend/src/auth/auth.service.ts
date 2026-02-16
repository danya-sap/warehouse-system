import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: any) {
    const candidate = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (candidate) throw new ConflictException('Email уже занят');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashedPassword, role: dto.role || 'WAREHOUSE_WORKER' },
    });

    return this.generateToken(user.id, user.email, user.role);
  }

  async login(dto: any) {
  const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) throw new UnauthorizedException('Неверный логин или пароль');

  const matches = await bcrypt.compare(dto.password, user.password);
  if (!matches) throw new UnauthorizedException('Неверный логин или пароль');

  const payload = { sub: user.id, email: user.email, role: user.role };
  
  return {
    access_token: await this.jwtService.signAsync(payload, {
      expiresIn: '8h',
      secret: process.env.JWT_SECRET,
    }),
    role: user.role,
  };
}

  private async generateToken(userId: string, email: string, role: string) {
  const payload = { sub: userId, email, role };
  return {
    access_token: await this.jwtService.signAsync(payload, {
      expiresIn: '8h',
      secret: process.env.JWT_SECRET,
    }),
    role: role, // Добавляем роль в ответ
  };
}
}