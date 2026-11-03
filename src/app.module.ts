import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { UploadFileService } from './common/uploadFile/uploadFile.service';
import { KbModule } from './kb/kb.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true, // 设置为全局模块，后续无需在其他 Module 中重复import
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    KbModule,
    AiModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    UploadFileService,
  ],
})
export class AppModule {}
