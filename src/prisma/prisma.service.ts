import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// 必须从自定义的 postgres 客户端路径导入！
import { PrismaClient } from '@prisma/client-postgres';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 1. 创建 pg 的连接池，传入环境变量中的数据库连接字符串
    const pool = new Pool({ connectionString: process.env.DATABASE_URL_POSTGRES });

    // 2. 实例化 Prisma 专用的驱动适配器
    const adapter = new PrismaPg(pool);

    // 3. 将其传递给基类构造函数（解决该错误的关键）
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
