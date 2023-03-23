import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SetSystemMessageDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID('4')
  readonly session_id: string;

  @ApiProperty()
  @IsNotEmpty()
  readonly message: string;
}
