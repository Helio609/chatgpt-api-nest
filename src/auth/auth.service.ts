import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as CryptoJs from 'crypto-js';
import { JwtService } from '@nestjs/jwt/dist';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.userService.findUserByUsername(username);
    if (!user || user.password != CryptoJs.MD5(password).toString())
      return null;
    return { sub: user.id, username: user.username };
  }

  login(payload) {
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
