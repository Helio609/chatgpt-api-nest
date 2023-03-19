import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { OpenaiModule } from 'src/openai/openai.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [OpenaiModule, PrismaModule],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
