import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { WatermarkService } from './watermark.service';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly watermarkService: WatermarkService,
  ) {}

  validateFile(file: Express.Multer.File, maxSizeMB: number) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new BadRequestException(
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${maxSizeMB}MB`,
      );
    }
  }

  async uploadFile(
    bucket: string,
    folder: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const fileName = `${randomUUID()}${ext}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await this.supabase
      .getClient()
      .storage.from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Upload failed: ${error.message}`, error);
      throw new BadRequestException('File upload failed');
    }

    return this.getPublicUrl(bucket, filePath);
  }

  async uploadFiles(
    bucket: string,
    folder: string,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const url = await this.uploadFile(bucket, folder, file);
      urls.push(url);
    }
    return urls;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .storage.from(bucket)
      .remove([path]);

    if (error) {
      this.logger.error(`Delete failed for ${bucket}/${path}: ${error.message}`);
    }
  }

  async uploadFileWithWatermark(
    bucket: string,
    folder: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const watermarkedBuffer = await this.watermarkService.applyWatermark(
      file.buffer,
      file.mimetype,
    );
    const watermarkedFile = { ...file, buffer: watermarkedBuffer };
    return this.uploadFile(bucket, folder, watermarkedFile);
  }

  async uploadFilesWithWatermark(
    bucket: string,
    folder: string,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const url = await this.uploadFileWithWatermark(bucket, folder, file);
      urls.push(url);
    }
    return urls;
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase
      .getClient()
      .storage.from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }
}
