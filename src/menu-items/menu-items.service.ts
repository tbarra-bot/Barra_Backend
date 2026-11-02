
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import {
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

@Injectable()
export class MenuItemsService {
  constructor(private readonly db: DatabaseService) {}

  private pool() {
    return this.db.getPool();
  }

  private validateBody(body: Record<string, any>) {
    const entries = Object.entries(body ?? {}).filter(
      ([key, value]) =>
        key !== 'id' &&
        value !== undefined &&
        /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key),
    );

    if (entries.length === 0) {
      throw new BadRequestException(
        'At least one valid field is required',
      );
    }

    if (
      entries.length !==
      Object.keys(body ?? {}).filter(
        (key) => key !== 'id' && body[key] !== undefined,
      ).length
    ) {
      throw new BadRequestException('Invalid field name');
    }

    return entries;
  }

  async create(body: Record<string, any>) {
    const entries = this.validateBody(body);
    const columns = entries.map(([key]) => `\`${key}\``);
    const placeholders = entries.map(() => '?').join(', ');
    const values = entries.map(([, value]) => value);

    const sql = `
      INSERT INTO menu_items (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    const [result] = await this.pool().execute<ResultSetHeader>(
      sql,
      values,
    );

    return this.findOne(result.insertId);
  }

  async findAll() {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      'SELECT * FROM menu_items',
    );

    return rows;
  }

  async findOne(id: number) {
    const [rows] = await this.pool().execute<RowDataPacket[]>(
      'SELECT * FROM menu_items WHERE id = ? LIMIT 1',
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Menu item not found');
    }

    return rows[0];
  }

  async update(id: number, body: Record<string, any>) {
    const entries = this.validateBody(body);
    const assignments = entries.map(
      ([key]) => `\`${key}\` = ?`,
    );
    const values = entries.map(([, value]) => value);

    values.push(id);

    const sql = `
      UPDATE menu_items
      SET ${assignments.join(', ')}
      WHERE id = ?
    `;

    const [result] = await this.pool().execute<ResultSetHeader>(
      sql,
      values,
    );

    if (result.affectedRows === 0) {
      return this.findOne(id);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const [result] = await this.pool().execute<ResultSetHeader>(
      'DELETE FROM menu_items WHERE id = ?',
      [id],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Menu item not found');
    }

    return {
      message: 'Menu item deleted successfully',
    };
  }
}
