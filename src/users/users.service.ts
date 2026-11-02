
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2/promise';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  private pool() {
    return this.db.getPool();
  }

  private handleDatabaseError(error: any): never {
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new ConflictException(
        'Username already exists. Please use another username.',
      );
    }

    throw error;
  }

  // CREATE
  async create(body: {
    username: string;
    password: string;
    role?: string;
  }) {
    if (!body.username?.trim() || !body.password) {
      throw new BadRequestException(
        'Username and password are required.',
      );
    }

    return this.createUser(
      body.username.trim(),
      body.password,
      body.role ?? 'user',
    );
  }

  async createUser(
    username: string,
    password: string,
    role = 'user',
  ) {
    if (!username?.trim() || !password) {
      throw new BadRequestException(
        'Username and password are required.',
      );
    }

    const normalizedUsername = username.trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const [result] = await this.pool().execute<ResultSetHeader>(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [normalizedUsername, hashedPassword, role],
      );

      return {
        id: result.insertId,
        username: normalizedUsername,
        role,
      };
    } catch (error: any) {
      this.handleDatabaseError(error);
    }
  }

  // FIND USER BY USERNAME - USED BY AUTH
  async findByUsername(username: string) {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      `SELECT id, username, password, role, refresh_token
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [username],
    );

    return rows[0] ?? null;
  }

  // FIND USER BY ID
  async findById(id: number) {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      `SELECT id, username, password, role, refresh_token, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id],
    );

    return rows[0] ?? null;
  }

  // FIND ONE - NEVER RETURN PASSWORD OR REFRESH TOKEN
  async findOne(id: number) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const {
      password,
      refresh_token,
      ...safeUser
    } = user;

    return safeUser;
  }

  // FIND ALL - NEVER RETURN PASSWORD OR REFRESH TOKEN
  async findAll() {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      `SELECT id, username, role, created_at
       FROM users
       ORDER BY id DESC`,
    );

    return rows;
  }

  // UPDATE
  async update(
    id: number,
    body: {
      username?: string;
      password?: string;
      role?: string;
    },
  ) {
    return this.updateUser(id, body);
  }

  async updateUser(
    id: number,
    partial: {
      username?: string;
      password?: string;
      role?: string;
    },
  ) {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (partial.username !== undefined) {
      if (!partial.username.trim()) {
        throw new BadRequestException(
          'Username cannot be empty.',
        );
      }

      fields.push('username = ?');
      values.push(partial.username.trim());
    }

    if (partial.password !== undefined) {
      if (!partial.password) {
        throw new BadRequestException(
          'Password cannot be empty.',
        );
      }

      const hashedPassword = await bcrypt.hash(
        partial.password,
        10,
      );

      fields.push('password = ?');
      values.push(hashedPassword);
    }

    if (partial.role !== undefined) {
      fields.push('role = ?');
      values.push(partial.role);
    }

    if (fields.length === 0) {
      return this.findOne(id);
    }

    values.push(id);

    const sql =
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

    try {
      const [result] = await this.pool().execute<ResultSetHeader>(
        sql,
        values,
      );

      if (result.affectedRows === 0) {
        const existingUser = await this.findById(id);

        if (!existingUser) {
          throw new NotFoundException('User not found.');
        }
      }

      return this.findOne(id);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.handleDatabaseError(error);
    }
  }

  // DELETE
  async remove(id: number) {
    return this.deleteUser(id);
  }

  async deleteUser(id: number) {
    const [result] = await this.pool().execute<ResultSetHeader>(
      'DELETE FROM users WHERE id = ?',
      [id],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('User not found.');
    }

    return {
      message: 'User deleted successfully.',
    };
  }

  // REFRESH TOKEN METHODS - USED BY AUTHENTICATION
  async setRefreshToken(
    id: number,
    refreshToken: string | null,
  ) {
    await this.pool().execute(
      'UPDATE users SET refresh_token = ? WHERE id = ?',
      [refreshToken, id],
    );
  }

  async findByRefreshToken(refreshToken: string) {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      `SELECT id, username, role
       FROM users
       WHERE refresh_token = ?
       LIMIT 1`,
      [refreshToken],
    );

    return rows[0] ?? null;
  }
}
