import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { firstValueFrom, map, Observable, ReplaySubject, skip } from 'rxjs';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { StreamData } from 'src/openai/typings';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { v4 as uuidv4 } from 'uuid';
import { SetSystemMessageDto } from './dto/set-system-message.dto';

export interface MessageEvent {
  data: string | object;
  type?: string;
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  private requestStream: {
    requestId: string;
    subject: ReplaySubject<StreamData>;
  }[] = [];

  @Post('process')
  async process(@CurrentUser() user, @Body() dto: SendMessageDto) {
    const subject = dto.stream ? new ReplaySubject<StreamData>() : null;
    const response = this.chatService.process(user.sub, dto, subject);
    if (dto.stream) {
      /** get the first chunk contains session_id */
      const requestId = uuidv4();
      const value = await firstValueFrom(subject);
      this.requestStream.push({ requestId, subject });
      setTimeout(() => {
        this.requestStream = this.requestStream.filter(
          (request) => request.requestId != requestId,
        );
      }, 60 * 10 * 1000);
      return { session_id: value.session_id, request_id: requestId };
    } else {
      return response;
    }
  }

  @Sse('process/:requestId')
  sse(@Param('requestId') requestId: string): Observable<MessageEvent> {
    const observable = this.requestStream
      .find((stream) => stream.requestId == requestId)
      ?.subject?.asObservable();
    if (observable) {
      return observable
        .pipe(skip(1))
        .pipe(map((payload) => ({ data: payload })));
    } else {
      return new Observable((subscribe) => {
        subscribe.next({ data: { error: 'No such request id' } });
        subscribe.complete();
      });
    }
  }

  @Get('sessions')
  getSessions(@CurrentUser() user) {
    return this.chatService.getSessions(user.sub);
  }

  @Get('session/:sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    return this.chatService.getSession(sessionId);
  }

  @Delete('session/:sessionId')
  removeSession(@Param('sessionId') sessionId: string) {
    return this.chatService.removeSession(sessionId);
  }

  @Delete('remove/:sessionId/:chatId')
  removeMessage(
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
  ) {
    return this.chatService.removeMessage(sessionId, chatId);
  }

  @Post('system_message')
  setSystemMessage(@Body() dto: SetSystemMessageDto) {
    return this.chatService.setSystemMessage(dto.session_id, dto.message);
  }
}
