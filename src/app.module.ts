import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [UserModule, AuthModule, ChatModule, ConfigModule.forRoot()],
  controllers: [],
  providers: [],
})
export class AppModule {}
