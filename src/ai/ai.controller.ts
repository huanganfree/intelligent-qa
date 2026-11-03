import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Sse, Res } from '@nestjs/common';
import { AiService } from './ai.service';
import { type Response } from 'express';

// 暂时不用，后续再考虑
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('content/chat')
  async streamChatPost(
    @Body() body: { prompt: string },
    @Res() res: Response, //  注入 Express 的 Response 对象，用于手动控制流式响应
  ) {}
}
