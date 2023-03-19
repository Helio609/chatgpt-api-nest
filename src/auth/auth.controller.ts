import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  login(@CurrentUser() user) {
    return this.authService.login(user);
  }

  @Post('register')
  register(@Body() dto: { username: string; password: string }) {
    return this.userService.register(dto.username, dto.password);
  }
}
