import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsNotEmpty()
  readonly username: string;
  @ApiProperty()
  @IsNotEmpty()
  @Length(8)
  readonly password: string;
}
