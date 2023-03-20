import { Injectable } from '@nestjs/common';
import { ReplaySubject } from 'rxjs';
import { OpenAIService, StreamData } from 'src/openai/openai.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

declare module 'src/openai/openai.service' {
  export interface StreamData {
    session_id?: string;
  }
}

@Injectable()
export class ChatService {
  constructor(
    private readonly openai: OpenAIService,
    private readonly prisma: PrismaService,
  ) { }

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
    subject.next({
      session_id: sessionId,
      id: null,
      delta: null,
      finish_reason: null,
    });

    /** check the session exist or create it */
    const session = await this.prisma.session.upsert({
      where: { id: sessionId },
      create: { messages: [], user_id: userId, id: sessionId },
      update: {},
    });

    /** add the user message to message chain */
    session.messages.push({ role: 'user', content: message });
    const response = await this.openai.sendMessages(
      session.messages as { role: string; content: string }[],
      config.openai_key,
      config.model,
      stream,
      subject,
    );
    session.messages.push({ role: 'assistant', content: response.content });
    /** update the message chain */
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { messages: session.messages },
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
  async getSessionIds(userId: number, page: number = 1, take: number = 5) {
    const sessionId = (await this.prisma.session.findMany({ where: { user_id: userId }, skip: (page - 1) * take, take })).flatMap(session => session.id)
    return { session_ids: sessionId }
  }

  async removeSessionById(sessionId: string) {
    return await this.prisma.session.delete({ where: { id: sessionId } })
  }

  async getChatHistoryBySessionId(sessionId: string) {
    return { messages: (await this.prisma.session.findUnique({ where: { id: sessionId } })).messages }
  }
}
