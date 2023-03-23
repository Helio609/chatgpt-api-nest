import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SetConfigDto } from './dto/set-config.dto';
import * as CryptoJs from 'crypto-js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  findUserByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async register(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        username: dto.username,
        password: CryptoJs.MD5(dto.password).toString(),
        config: {
          create: {
            openai_key: process.env.OPENAI_INIT_KEY,
          },
        },
      },
      select: { id: true, username: true },
    });
  }

  async getConfig(userId: number) {
    return this.prisma.config.findUnique({
      where: { user_id: userId },
      select: { model: true, openai_key: true },
    });
  }

  async setConfig(userId: number, config: SetConfigDto) {
    return this.prisma.config.update({
      where: { user_id: userId },
      data: {
        ...config,
      },
      select: { model: true, openai_key: true },
    });
  }

  async getUsage(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, token: true },
    });
  }
}
