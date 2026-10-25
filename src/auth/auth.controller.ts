
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(
    @Body() body: { username: string; password: string },
  ) {
    if (
      !body?.username?.trim() ||
      typeof body.password !== 'string' ||
      !body.password.trim()
    ) {
      throw new HttpException(
        'Username and password are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.usersService.createUser(
      body.username.trim(),
      body.password,
    );
  }

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
  ) {
    if (
      !body?.username?.trim() ||
      typeof body.password !== 'string' ||
      !body.password.trim()
    ) {
      throw new HttpException(
        'Username and password are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.authService.validateUser(
      body.username.trim(),
      body.password,
    );

    if (!user) {
      throw new HttpException(
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.authService.login(user);
  }

  @Post('logout')
  async logout(
    @Body() body: { userId: number },
  ) {
    const userId = Number(body?.userId);

    if (
      body?.userId === undefined ||
      body?.userId === null ||
      body?.userId === '' ||
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      throw new HttpException(
        'A valid userId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.authService.logout(userId);
  }

  @Post('refresh')
  async refresh(
    @Body() body: { refreshToken: string },
  ) {
    if (
      typeof body?.refreshToken !== 'string' ||
      !body.refreshToken.trim()
    ) {
      throw new HttpException(
        'Refresh token is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.authService.refreshTokens(
      body.refreshToken,
    );
  }
}
