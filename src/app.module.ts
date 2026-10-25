
import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PositionsModule } from './positions/positions.module';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    AuthModule,
    PositionsModule,
  ],
})
export class AppModule {}
