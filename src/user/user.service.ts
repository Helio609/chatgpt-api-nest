import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as CryptoJs from 'crypto-js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async register(username: string, password: string) {
    const user = await this.prisma.user.create({
      data: {
        username,
        password: CryptoJs.MD5(password).toString(),
        config: {
          create: {
            openai_key: process.env.OPENAI_INIT_KEY,
          },
        },
      },
    });
    return { sub: user.id, username: user.username };
  }

  async getConfig(userId: number) {
    return await this.prisma.config.findUnique({ where: { user_id: userId } });
  }

  async setConfig(
    userId: number,
    config: { openai_key: string; model: string },
  ) {
    return await this.prisma.config.update({
      where: { user_id: userId },
      data: config,
    });
  }
}
