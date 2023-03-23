import { Injectable } from '@nestjs/common';
import { ReplaySubject } from 'rxjs';
import { OpenAIService } from 'src/openai/openai.service';
import {
  Message,
  Messages,
  OpenAIResponse,
  StreamData,
} from 'src/openai/typings';
import { PrismaService } from 'src/prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { v4 as uuidv4 } from 'uuid';

declare module 'src/openai/typings' {
  export interface StreamData {
    session_id?: string;
    error?: string;
  }
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAIService,
  ) {}

  async process(
    userId: number,
    dto: SendMessageDto,
    subject?: ReplaySubject<StreamData>,
  ) {
    const sessionId = dto.sessionId ?? uuidv4();
    subject?.next({ session_id: sessionId });
    const config = await this.prisma.config.findUnique({
      where: { user_id: userId },
    });
    const session = (await this.prisma.session.findUnique({
      where: { id: sessionId },
    })) ?? {
      id: sessionId,
      messages: [] as Messages,
      chat_name: dto.message,
    };
    session.messages.push({ id: uuidv4(), role: 'user', content: dto.message });
    let response: OpenAIResponse;
    try {
      response = await this.openai.sendMessages(
        session.messages as Messages,
        config.openai_key,
        config.model,
        dto.stream,
        subject,
      );
    } catch (e) {
      subject?.next({ error: 'Request api of OpenAI failed' });
      subject?.complete();
      throw Error('Request api of OpenAI failed');
    }
    session.messages.push({
      id: response.id,
      role: 'assistant',
      content: response.content,
    });
    await Promise.all([
      this.prisma.session.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          user_id: userId,
          messages: session.messages,
          chat_name: session.chat_name,
          token: response.usage.total_tokens,
        },
        update: {
          messages: session.messages,
          token: response.usage.total_tokens,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          token: {
            increment: response.usage.total_tokens,
          },
        },
      }),
    ]);
    return {
      session_id: sessionId,
      ...response,
    };
  }

  async getSessions(userId: number) {
    return this.prisma.session.findMany({
      where: { user_id: userId },
      select: { id: true, chat_name: true, token: true },
    });
  }

  async getSession(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, chat_name: true, messages: true, token: true },
    });
  }

  async removeSession(sessionId: string) {
    return this.prisma.session.delete({ where: { id: sessionId } });
  }

  async removeMessage(sessionId: string, chatId: string) {
    const session = await this.getSession(sessionId);
    session.messages = session.messages.filter(
      (message) => (message as Message).id != chatId,
    );
    return this.prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        messages: session.messages,
      },
      select: { id: true, chat_name: true },
    });
  }

  async setSystemMessage(sessionId: string, message: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    session.messages = session.messages.filter(
      (message) => (message as Message).role != 'system',
    );
    session.messages.unshift({ role: 'system', content: message });
    return this.prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        messages: session.messages,
      },
      select: { id: true, chat_name: true },
    });
  }
}
