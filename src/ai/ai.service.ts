import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import OpenAI from 'openai';
import { type Response } from 'express';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    // 初始化大模型客户端
    this.openai = new OpenAI({
      apiKey: process.env.AI_API_KEY,
      baseURL: process.env.AI_API_BASEURL, // 具体模型服务商
    });
  }

  // 获取提示词
  getPrompt(messages: OpenAI.ChatCompletionMessageParam[] = [], res: Response) {
    // 必须手动设置标准 SSE 协议所需的响应头
    res.setHeader('Content-Type', 'text/event-stream'); // 声明这是一个事件流
    res.setHeader('Cache-Control', 'no-cache'); // 禁止前端和代理缓存数据
    res.setHeader('Connection', 'keep-alive'); // 保持长连接不中断
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓存（防止打字机效果失效）

    // 调用 Service 获取 RxJS 观察者流
    const stream$ = this.createChatStream(messages);

    // 手动订阅这个流，并将数据实时写入 HTTP 响应体中
    const subscription = stream$.subscribe({
      next: (event) => {
        // SSE 规范的格式：data: {"text":"..."}\n\n
        res.write(`data: ${JSON.stringify(event.data)}\n\n`);
      },
      error: (err) => {
        console.error('AI 流传输中途出错:', err);
        res.end(); // 出错时必须关闭连接
      },
      complete: () => {
        res.end(); // AI 回答完毕，正常关闭 HTTP 连接
      },
    });

    //  兜底处理：如果前端主动断开连接（比如关闭了网页），及时取消订阅，通知大模型停止生成
    res.on('close', () => {
      subscription.unsubscribe();
    });
  }

  // 核心方法返回一个 RxJS 观察者对象
  createChatStream(messages: OpenAI.ChatCompletionMessageParam[] = []): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const stream = await this.openai.chat.completions.create({
            model: 'deepseek-flash', // 对应的模型名称
            messages,
            stream: true, // 开启流式
            temperature: 0.1, // 调低随机性，让大模型极其严谨，严格遵循资料
          });

          for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content || '';
            if (content) {
              // 逐字推送到管道中
              subscriber.next({ data: { text: content } });
            }
          }
          // AI 输出完毕，关闭流
          subscriber.complete();
        } catch (error) {
          // 异常处理
          subscriber.error(error);
        }
      })();
    });
  }
}
