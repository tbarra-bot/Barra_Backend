
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import {
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2/promise';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: DatabaseService,
  ) {}

  private readonly allowedFields = [
    'customer_id',
    'order_date',
    'order_type',
    'order_status',
  ];

  private validateBody(data: Record<string, any>) {
    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    ) {
      throw new BadRequestException(
        'Invalid request body',
      );
    }

    const entries = Object.entries(data).filter(
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

  async findAll() {
    const [rows] =
      await this.db.getPool().execute<RowDataPacket[]>(
        'SELECT * FROM orders ORDER BY order_id ASC',
      );

    return rows;
  }

  async findOne(id: number) {
    const [rows] =
      await this.db.getPool().execute<RowDataPacket[]>(
        'SELECT * FROM orders WHERE order_id = ? LIMIT 1',
        [id],
      );

    if (rows.length === 0) {
      throw new NotFoundException(
        'Order not found',
      );
    }

    return rows[0];
  }

  async create(data: Record<string, any>) {
    const entries = this.validateBody(data);

    const requiredFields = [
      'customer_id',
      'order_type',
    ];

    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ''
      ) {
        throw new BadRequestException(
          `${field} is required`,
        );
      }
    }

    const customerId = Number(data.customer_id);

    if (
      !Number.isInteger(customerId) ||
      customerId <= 0
    ) {
      throw new BadRequestException(
        'Invalid customer_id',
      );
    }

    const columns = entries.map(
      ([key]) => `\`${key}\``,
    );

    const placeholders = entries
      .map(() => '?')
      .join(', ');

    const values = entries.map(
      ([key, value]) => {
        if (key === 'customer_id') {
          return customerId;
        }

        return value;
      },
    );

    const sql = `
      INSERT INTO orders (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    const [result] =
      await this.db.getPool().execute<ResultSetHeader>(
        sql,
        values,
      );

    return this.findOne(result.insertId);
  }

  async update(
    id: number,
    data: Record<string, any>,
  ) {
    const entries = this.validateBody(data);

    const assignments = entries.map(
      ([key]) => `\`${key}\` = ?`,
    );

    const values = entries.map(
      ([key, value]) => {
        if (key === 'customer_id') {
          const customerId = Number(value);

          if (
            !Number.isInteger(customerId) ||
            customerId <= 0
          ) {
            throw new BadRequestException(
              'Invalid customer_id',
            );
          }

          return customerId;
        }

        return value;
      },
    );

    values.push(id);

    const sql = `
      UPDATE orders
      SET ${assignments.join(', ')}
      WHERE order_id = ?
    `;

    await this.db.getPool().execute<ResultSetHeader>(
      sql,
      values,
    );

    return this.findOne(id);
  }

  async remove(id: number) {
    const [result] =
      await this.db.getPool().execute<ResultSetHeader>(
        'DELETE FROM orders WHERE order_id = ?',
        [id],
      );

    if (result.affectedRows === 0) {
      throw new NotFoundException(
        'Order not found',
      );
    }

    return {
      message: 'Order deleted successfully',
    };
  }
}
