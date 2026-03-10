import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { WatermarkService } from './watermark.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [StorageController],
  providers: [StorageService, WatermarkService],
  exports: [StorageService],
})
export class StorageModule {}
