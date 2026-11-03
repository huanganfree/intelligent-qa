import { Injectable, BadRequestException, Global } from '@nestjs/common';
import { extname, join, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

@Injectable()
export class UploadFileService {
  private readonly uploadDir = resolve(process.cwd(), 'uploads');

  constructor() {
    // 确保初始化时目录存在
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 核心保存方法：可被 controller 调用，也可被其他 service 直接调用
   */
  async saveLocalFile(file: Express.Multer.File): Promise<{ originalname: string; filePath: string }> {
    if (!file) {
      throw new BadRequestException('未检测到上传文件');
    }

    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    const ext = extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;

    // 写入文件到服务器磁盘
    const filePath = join(this.uploadDir, filename);
    writeFileSync(filePath, file.buffer); // 注意：如果用内存模式，file里会有 buffer

    return {
      originalname: file.originalname,
      filePath: `/uploads/${filename}`, // 返回给前端访问的相对路径
    };
  }
}
