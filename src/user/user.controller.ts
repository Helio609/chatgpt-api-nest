import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { SetConfigDto } from './dto/set-config.dto';
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('config')
  getConfig(@CurrentUser() user) {
    return this.userService.getConfig(user.sub);
  }

  @Post('config')
  setConfig(@CurrentUser() user, @Body() dto: SetConfigDto) {
    return this.userService.setConfig(user.sub, dto);
  }

  @Get('usage')
  getUsage(@CurrentUser() user) {
    return this.userService.getUsage(user.sub);
  }
}
