
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
  constructor(
    private readonly db: DatabaseService,
  ) {}

  private pool() {
    return this.db.getPool();
  }

  private readonly allowedFields = [
    'item_name',
    'category',
    'description',
    'price',
    'availability_status',
  ];

  private validateBody(body: Record<string, any>) {
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      throw new BadRequestException(
        'Invalid request body',
      );
    }

    const entries = Object.entries(body).filter(
      ([, value]) => value !== undefined,
    );

    if (entries.length === 0) {
      throw new BadRequestException(
        'At least one valid field is required',
      );
    }

    const invalidField = entries.find(
      ([key]) => !this.allowedFields.includes(key),
    );

    if (invalidField) {
      throw new BadRequestException(
        `Invalid field: ${invalidField[0]}`,
      );
    }

    return entries;
  }

  async create(body: Record<string, any>) {
    const entries = this.validateBody(body);

    const requiredFields = [
      'item_name',
      'category',
      'price',
    ];

    for (const field of requiredFields) {
      if (
        body[field] === undefined ||
        body[field] === null ||
        body[field] === ''
      ) {
        throw new BadRequestException(
          `${field} is required`,
        );
      }
    }

    const columns = entries.map(
      ([key]) => `\`${key}\``,
    );

    const placeholders = entries
      .map(() => '?')
      .join(', ');

    const values = entries.map(
      ([, value]) => value,
    );

    const sql = `
      INSERT INTO menu_item (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    const [result] =
      await this.pool().execute<ResultSetHeader>(
        sql,
        values,
      );

    return this.findOne(result.insertId);
  }

  async findAll() {
    const [rows] =
      await this.pool().execute<RowDataPacket[]>(
        'SELECT * FROM menu_item ORDER BY item_id ASC',
      );

    return rows;
  }

  async findOne(id: number) {
    const [rows] =
      await this.pool().execute<RowDataPacket[]>(
        'SELECT * FROM menu_item WHERE item_id = ? LIMIT 1',
        [id],
      );

    if (rows.length === 0) {
      throw new NotFoundException(
        'Menu item not found',
      );
    }

    return rows[0];
  }

  async update(
    id: number,
    body: Record<string, any>,
  ) {
    const entries = this.validateBody(body);

    const assignments = entries.map(
      ([key]) => `\`${key}\` = ?`,
    );

    const values = entries.map(
      ([, value]) => value,
    );

    values.push(id);

    const sql = `
      UPDATE menu_item
      SET ${assignments.join(', ')}
      WHERE item_id = ?
    `;

    await this.pool().execute<ResultSetHeader>(
      sql,
      values,
    );

    return this.findOne(id);
  }

  async remove(id: number) {
    const [result] =
      await this.pool().execute<ResultSetHeader>(
        'DELETE FROM menu_item WHERE item_id = ?',
        [id],
      );

    if (result.affectedRows === 0) {
      throw new NotFoundException(
        'Menu item not found',
      );
    }

    return {
      message: 'Menu item deleted successfully',
    };
  }
}
