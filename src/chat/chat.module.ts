import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OpenAIModule } from 'src/openai/openai.module';

@Module({
  imports: [PrismaModule, OpenAIModule],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
