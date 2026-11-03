import { Global, Module } from '@nestjs/common';
import { UploadFileService } from './uploadFile.service';

@Global()
@Module({
  providers: [UploadFileService],
  exports: [UploadFileService], // 必须导出，别人才能用
})
export class UploadFileModule {}
