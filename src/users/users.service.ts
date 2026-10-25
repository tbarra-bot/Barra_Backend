
import {
  Injectable,
  NotFoundException,
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

  async createUser(
    username: string,
    password: string,
    role = 'user',
  ) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await this.pool().execute<ResultSetHeader>(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role],
    );

    return {
      id: result.insertId,
      username,
      role,
    };
  }

  async findByUsername(username: string) {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      'SELECT id, username, password, role, refresh_token FROM users WHERE username = ? LIMIT 1',
      [username],
    );

    return rows[0] ?? null;
  }

  async findById(id: number) {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      'SELECT id, username, password, role, refresh_token, created_at FROM users WHERE id = ? LIMIT 1',
      [id],
    );

    return rows[0] ?? null;
  }

  async findAll() {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      'SELECT id, username, role, created_at FROM users',
    );

    return rows;
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
      fields.push('username = ?');
      values.push(partial.username);
    }

    if (partial.password !== undefined) {
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
      const existingUser = await this.findById(id);

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      const { password, refresh_token, ...safeUser } = existingUser;
      return safeUser;
    }

    values.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

    const [result] = await this.pool().execute<ResultSetHeader>(
      sql,
      values,
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.findById(id);

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    const { password, refresh_token, ...safeUser } = updatedUser;
    return safeUser;
  }

  async deleteUser(id: number) {
    const [result] = await this.pool().execute<ResultSetHeader>(
      'DELETE FROM users WHERE id = ?',
      [id],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User deleted successfully',
    };
  }

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
      'SELECT id, username, role FROM users WHERE refresh_token = ? LIMIT 1',
      [refreshToken],
    );

    return rows[0] ?? null;
  }
}
