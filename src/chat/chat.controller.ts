import { Controller } from '@nestjs/common';
import {
  Body,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common/decorators';
import { AuthGuard } from '@nestjs/passport';
import { map, Observable, ReplaySubject, skip, take } from 'rxjs';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { v4 as uuidv4 } from 'uuid';
import { StreamData } from 'src/openai/openai.service';

export interface MessageEvent {
  data: string | object;
  type?: string;
}

declare module 'src/openai/openai.service' {
  export interface StreamData {
    request_id?: string;
  }
}

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  private responseStream: {
    request_id?: string;
    subject: ReplaySubject<StreamData>;
  }[] = [];

  @Post('process')
  process(
    @Res() res,
    @CurrentUser() user,
    @Body() dto: { session_id?: string; message: string; stream?: boolean },
  ) {
    /** if stream is enabled, it should return the session_id and responseId */
    const subject: ReplaySubject<StreamData> = new ReplaySubject();
    const response = this.chatService.process(
      user.sub,
      dto.message,
      dto.session_id,
      dto.stream,
      subject,
    );
    if (dto.stream) {
      subject.pipe(take(1)).subscribe((data) => {
        const requestId = uuidv4();
        this.responseStream.push({ request_id: requestId, subject });
        setTimeout(() => {
          /** delete the stream object */
          this.responseStream = this.responseStream.filter((response) => {
            response.request_id != requestId;
          });
        }, 3600 * 1000);
        res.json({ session_id: data.session_id, request_id: requestId });
      });
    } else {
      return response;
    }
  }

  @Sse('process/:requestId')
  sse(@Param('requestId') requestId: string): Observable<MessageEvent> {
    const observable = this.responseStream
      .find((stream) => stream.request_id == requestId)
      ?.subject?.asObservable();
    if (observable) {
      observable.subscribe({
        complete: () => {
          /** remove the response item */
          this.responseStream = this.responseStream.filter((response) => {
            response.request_id != requestId;
          });
        },
      });
      return observable
        .pipe(skip(1))
        .pipe(map((payload) => ({ data: payload })));
    } else {
      return new Observable();
    }

  }

  @Get('sessions')
  getSessionId(@CurrentUser() user, @Query('page') page: number, @Query('take') take: number) {
    return this.chatService.getSessionIds(user.sub, page, take)
  }

  @Delete('session/:id')
  removeSessionById(@Param('id') sessionId: string) {
    return this.chatService.removeSessionById(sessionId)
  }

  @Get('history/:id')
  getChatHistoryBySessionId(sessionId: string) {
    return this.chatService.getChatHistoryBySessionId(sessionId)
  }
}
