import { ApiProperty } from '@nestjs/swagger';

export class SetConfigDto {
  @ApiProperty()
  readonly openai_key?: string;
  @ApiProperty()
  readonly model?: string;
}
