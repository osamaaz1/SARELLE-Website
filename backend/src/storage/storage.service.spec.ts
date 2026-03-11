import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { SupabaseService } from '../supabase/supabase.service';
import { WatermarkService } from './watermark.service';
import { createMockSupabaseService } from '../test-utils/mock-supabase';

describe('StorageService', () => {
  let service: StorageService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let watermarkService: jest.Mocked<WatermarkService>;

  const mockFile: Express.Multer.File = {
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('test-image-data'),
    fieldname: 'file',
    encoding: '7bit',
    stream: null as any,
    destination: '',
    filename: 'test.jpg',
    path: '',
  };

  const mockWatermarkService = {
    applyWatermark: jest.fn().mockResolvedValue(Buffer.from('watermarked')),
  };

  beforeEach(async () => {
    supabaseService = createMockSupabaseService() as any;
    watermarkService = mockWatermarkService as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: WatermarkService, useValue: watermarkService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should accept valid MIME types (image/jpeg)', () => {
      const validFile = { ...mockFile, mimetype: 'image/jpeg' } as Express.Multer.File;

      expect(() => service.validateFile(validFile, 5)).not.toThrow();
    });

    it('should reject invalid MIME types (application/pdf)', () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' } as Express.Multer.File;

      expect(() => service.validateFile(invalidFile, 5)).toThrow(BadRequestException);
    });

    it('should reject oversized files', () => {
      const oversizedFile = {
        ...mockFile,
        size: 50 * 1024 * 1024, // 50MB
      } as Express.Multer.File;

      expect(() => service.validateFile(oversizedFile, 5)).toThrow(BadRequestException);
    });
  });

  describe('uploadFile', () => {
    it('should upload file and return public URL', async () => {
      const mockPublicUrl = 'https://supabase.storage/v1/object/public/photos/test.jpg';
      supabaseService.getClient.mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue({ data: { path: 'photos/test.jpg' }, error: null }),
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: mockPublicUrl },
            }),
          }),
        },
      } as any);

      const result = await service.uploadFile('photos', 'submissions', mockFile);

      expect(result).toContain(mockPublicUrl);
    });

    it('should throw on upload error', async () => {
      supabaseService.getClient.mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Storage quota exceeded' },
            }),
          }),
        },
      } as any);

      await expect(service.uploadFile('photos', 'submissions', mockFile)).rejects.toThrow();
    });
  });

  describe('uploadFileWithWatermark', () => {
    it('should call watermarkService.applyWatermark before upload', async () => {
      const watermarkedBuffer = Buffer.from('watermarked-image-data');
      watermarkService.applyWatermark.mockResolvedValue(watermarkedBuffer);

      const mockPublicUrl = 'https://supabase.storage/v1/object/public/photos/watermarked-test.jpg';
      supabaseService.getClient.mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue({ data: { path: 'photos/test.jpg' }, error: null }),
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: mockPublicUrl },
            }),
          }),
        },
      } as any);

      await service.uploadFileWithWatermark('photos', 'submissions', mockFile);

      expect(watermarkService.applyWatermark).toHaveBeenCalledWith(mockFile.buffer, expect.anything());
    });
  });

  describe('deleteFile', () => {
    it('should call storage.remove to delete the file', async () => {
      const removeMock = jest.fn().mockResolvedValue({ data: null, error: null });
      supabaseService.getClient.mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue({
            remove: removeMock,
          }),
        },
      } as any);

      await service.deleteFile('photos', 'test.jpg');

      expect(removeMock).toHaveBeenCalledWith(expect.arrayContaining(['test.jpg']));
    });
  });

  describe('getPublicUrl', () => {
    it('should return public URL from Supabase storage', () => {
      const mockPublicUrl = 'https://supabase.storage/v1/object/public/photos/test.jpg';
      supabaseService.getClient.mockReturnValue({
        storage: {
          from: jest.fn().mockReturnValue({
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: mockPublicUrl },
            }),
          }),
        },
      } as any);

      const result = service.getPublicUrl('photos', 'test.jpg');

      expect(result).toBe(mockPublicUrl);
    });
  });
});
