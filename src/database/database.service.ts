import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: mysql.Pool;

  async onModuleInit(): Promise<void> {
    const host = process.env.DB_HOST;
    const port = Number(process.env.DB_PORT);
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME || 'defaultdb';

    if (!host || !port || !user || !password) {
      throw new Error(
        'Missing database configuration. Check DB_HOST, DB_PORT, DB_USER, and DB_PASSWORD in .env',
      );
    }

    const caPath = path.join(process.cwd(), 'certs', 'ca.pem');

    if (!fs.existsSync(caPath)) {
      throw new Error(`CA certificate not found: ${caPath}`);
    }

    const ca = fs.readFileSync(caPath, 'utf8');

    this.pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 20000,
      ssl: {
        ca,
        rejectUnauthorized: true,
      },
    });

    try {
      const connection = await this.pool.getConnection();

      try {
        await connection.ping();
        console.log('MySQL database connected successfully');
      } finally {
        connection.release();
      }
    } catch (error) {
      await this.pool.end();
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('MySQL database pool closed');
    }
  }

  getPool(): mysql.Pool {
    return this.pool;
  }
}