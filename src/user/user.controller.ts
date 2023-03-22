import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('config')
  getConfig(@CurrentUser() user) {
    return this.userService.getConfig(user.sub);
  }

  @Post('set_config')
  setConfig(
    @CurrentUser() user,
    @Body() dto: { openai_key: string; model: string },
  ) {
    return this.userService.setConfig(user.sub, dto);
  }
}
