import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class SendMessageDto {
  @ApiProperty()
  @IsOptional()
  @IsUUID('4')
  readonly sessionId?: string;

  @ApiProperty()
  @IsNotEmpty()
  readonly message: string;

  @ApiProperty()
  @IsOptional()
  readonly stream?: boolean;
}
