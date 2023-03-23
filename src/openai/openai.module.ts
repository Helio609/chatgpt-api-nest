import { Module } from '@nestjs/common';
import { HttpModule } from 'src/http/http.module';
import { OpenAIService } from './openai.service';

@Module({
  imports: [HttpModule],
  exports: [OpenAIService],
  providers: [OpenAIService],
})
export class OpenAIModule {}
