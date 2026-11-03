import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { KbService } from './kb.service';
import { NoJwtDeco } from '../common/decorators/noJwt.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Response } from 'express';

@NoJwtDeco()
@Controller('kb')
export class KbController {
  constructor(private readonly kbService: KbService) {}

  // 提示词回答，调用ai服务，与用户进行对话
  @Post('chat')
  async chat(@Body() body: { query: string }, @Res() res: Response) {
    return this.kbService.chat(body.query, res);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.kbService.upload(file);
  }

  // 调用语义搜索
  @Post('search')
  async search(@Body() body: { query: string }) {
    return this.kbService.searchEnrollmentPlans(body.query);
  }
}
