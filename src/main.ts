import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// 全局修复 BigInt 无法序列化为 JSON 的问题
(BigInt.prototype as any).toJSON = function () {
  return this.toString(); // 转成字符串，防止前端大数精度丢失
};
async function bootstrapSwagger(app: NestExpressApplication) {
  const config = new DocumentBuilder()
    .setTitle('火焰后台管理系统')
    .setVersion('1.0')
    .addTag('菜单', '菜单相关接口')
    .addTag('角色', '角色相关接口')
    .addTag('用户', '用户相关接口')
    .addTag('登录', '登录相关接口')
    .addTag('内容', '内容相关接口')
    .addTag('ai智能', 'ai智能相关接口')
    .addTag('系统字典', '系统字典相关接口')

    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  // 注意：不能使用 'api'，会与全局前缀及 MenuController 的根路由 @Get() 冲突
  SwaggerModule.setup('docs', app, documentFactory);
}

async function bootstrap() {
  // 在泛型中指定 NestExpressApplication
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 配置静态资源托管
  app.useStaticAssets(resolve(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // 统一前缀，/api
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // 核心配置：开启自动类型转换（把 string 自动转成 DTO 声明的类型）
      whitelist: true, // 建议顺便开启：自动过滤掉 DTO 中未声明的非安全属性
    }),
  );

  await bootstrapSwagger(app);

  await app.listen(process.env.PORT);

  console.log('process.env.NODE_ENV==', process.env.NODE_ENV);
}

bootstrap();
