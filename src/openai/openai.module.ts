import { Module } from '@nestjs/common';
import { HttpModule } from 'src/http/http.module';
import { OpenaiService } from './openai.service';

@Module({
  imports: [HttpModule],
  exports: [OpenaiService],
  providers: [OpenaiService],
})
export class OpenaiModule {}
