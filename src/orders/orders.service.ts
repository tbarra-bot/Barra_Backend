
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const [rows] = await this.db.getPool().execute<RowDataPacket[]>(
      'SELECT * FROM orders ORDER BY order_id',
    );
    return rows;
  }

  async findOne(id: number) {
    const [rows] = await this.db.getPool().execute<RowDataPacket[]>(
      'SELECT * FROM orders WHERE order_id = ?',
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Order not found');
    }

    return rows[0];
  }

  async create(data: {
    order_code: string;
    customer_id: number;
    order_date: string;
    total_amount: number;
  }) {
    const [result] = await this.db.getPool().execute<ResultSetHeader>(
      `INSERT INTO orders
       (order_code, customer_id, order_date, total_amount)
       VALUES (?, ?, ?, ?)`,
      [
        data.order_code,
        data.customer_id,
        data.order_date,
        data.total_amount,
      ],
    );

    return this.findOne(result.insertId);
  }

  async update(
    id: number,
    data: {
      order_code?: string;
      customer_id?: number;
      order_date?: string;
      total_amount?: number;
    },
  ) {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.order_code !== undefined) {
      fields.push('order_code = ?');
      values.push(data.order_code);
    }

    if (data.customer_id !== undefined) {
      fields.push('customer_id = ?');
      values.push(data.customer_id);
    }

    if (data.order_date !== undefined) {
      fields.push('order_date = ?');
      values.push(data.order_date);
    }

    if (data.total_amount !== undefined) {
      fields.push('total_amount = ?');
      values.push(data.total_amount);
    }

    if (fields.length === 0) {
      return this.findOne(id);
    }

    values.push(id);

    const [result] = await this.db.getPool().execute<ResultSetHeader>(
      `UPDATE orders SET ${fields.join(', ')} WHERE order_id = ?`,
      values,
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Order not found');
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const [result] = await this.db.getPool().execute<ResultSetHeader>(
      'DELETE FROM orders WHERE order_id = ?',
      [id],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Order not found');
    }

    return { message: 'Order deleted successfully' };
  }
}
