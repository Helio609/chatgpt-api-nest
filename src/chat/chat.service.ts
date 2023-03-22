import { Injectable } from '@nestjs/common';
import { ReplaySubject } from 'rxjs';
import {
  OpenaiResponse,
  OpenAIService,
  StreamData,
} from 'src/openai/openai.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

declare module 'src/openai/openai.service' {
  export interface StreamData {
    session_id?: string;
    error?: string;
  }
}

@Injectable()
export class ChatService {
  constructor(
    private readonly openai: OpenAIService,
    private readonly prisma: PrismaService,
  ) {}

  async process(
    userId: number,
    message: string,
    sessionId?: string,
    stream?: boolean,
    subject?: ReplaySubject<StreamData>,
  ) {
    const config = await this.prisma.config.findUnique({
      where: { user_id: userId },
    });
    sessionId = sessionId ?? uuidv4();

    /** TODO: avoid using the type StreamData and avoid using subject in this function */
    /** first thing is pass the session id to client */
    subject?.next({
      session_id: sessionId,
      id: null,
      delta: null,
      finish_reason: null,
    });

    /** check the session exist or create it */
    const session = await this.prisma.session.upsert({
      where: { id: sessionId },
      create: {
        user_id: userId,
        id: sessionId,
        messages: [],
        chat_name: message.substring(0, 10),
      },
      update: {},
    });

    /** add the user message to message chain */
    session.messages.push({ role: 'user', content: message });
    let response: OpenaiResponse;
    try {
      response = await this.openai.sendMessages(
        session.messages as { role: string; content: string }[],
        config.openai_key,
        config.model,
        stream,
        subject,
      );
    } catch {
      subject?.next({
        error: 'Something went wrong, please try again',
      });
      subject?.complete();
      return {
        error: 'something went wrong, please try again',
      };
    }
    session.messages.push({ role: 'assistant', content: response.content });
    /** update the message chain */
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { messages: session.messages, token: response.usage.total_tokens },
    });

    return {
      session_id: sessionId,
      ...response,
    };
  }

  /**
   * return all the session
   * @param userId
   */
  async getSessionIds(userId: number, page = 1, take = 5) {
    const sessionId = (
      await this.prisma.session.findMany({
        where: { user_id: userId },
        skip: (page - 1) * take,
        take,
      })
    ).flatMap((session) => {
      return { id: session.id, chat_name: session.chat_name };
    });
    return { session_ids: sessionId };
  }

  async removeSessionById(sessionId: string) {
    return await this.prisma.session.delete({ where: { id: sessionId } });
  }

  async getChatHistoryBySessionId(sessionId: string) {
    return await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, chat_name: true, messages: true, token: true },
    });
  }
}
