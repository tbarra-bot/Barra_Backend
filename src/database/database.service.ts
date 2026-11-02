
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

@Injectable()
export class DatabaseService
  implements OnModuleInit, OnModuleDestroy
{
  private pool!: mysql.Pool;

  async onModuleInit(): Promise<void> {
    const host = process.env.DB_HOST;
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME || 'quickbite_midterm';

    if (!host || !user || !password) {
      throw new Error(
        'Missing database configuration. Check DB_HOST, DB_PORT, DB_USER, and DB_PASSWORD in your .env file.',
      );
    }

    const caPath =
      process.env.DB_CA_CERT_PATH ||
      (process.env.RENDER
        ? '/etc/secrets/ca.pem'
        : path.join(process.cwd(), 'certs', 'ca.pem'));

    if (!fs.existsSync(caPath)) {
      throw new Error(
        `CA certificate not found: ${caPath}. Check your DB_CA_CERT_PATH or certs/ca.pem file.`,
      );
    }

    const ca = fs.readFileSync(caPath, 'utf8');

    this.pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,

      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 5,
      idleTimeout: 60000,
      queueLimit: 0,
      connectTimeout: 30000,

      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,

      ssl: {
        ca,
        rejectUnauthorized: true,
      },
    });

    try {
      const connection = await this.pool.getConnection();

      try {
        await connection.ping();

        const [rows] = await connection.query(
          'SELECT DATABASE() AS database_name',
        );

        console.log('MySQL database connected successfully');
        console.log('Connected database:', rows);
      } finally {
        connection.release();
      }
    } catch (error) {
      await this.pool.end();
      console.error('MySQL database connection failed:', error);
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
    if (!this.pool) {
      throw new Error(
        'Database connection pool is not initialized.',
      );
    }

    return this.pool;
  }
}
