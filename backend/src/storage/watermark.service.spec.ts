jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockReturnValue({
    metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
    composite: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('watermarked')),
  });
  return { __esModule: true, default: mockSharp };
});

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn(),
}));

import { WatermarkService } from './watermark.service';
import * as fs from 'fs';

describe('WatermarkService', () => {
  let service: WatermarkService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WatermarkService();
  });

  describe('applyWatermark', () => {
    it('should return processed buffer for JPEG image', async () => {
      const inputBuffer = Buffer.from('original-image');

      const result = await service.applyWatermark(inputBuffer, 'image/jpeg');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('watermarked');
    });

    it('should return original buffer on error (fallback)', async () => {
      const sharp = require('sharp').default;
      sharp.mockReturnValueOnce({
        metadata: jest.fn().mockRejectedValue(new Error('Sharp processing failed')),
        composite: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error('Sharp processing failed')),
      });

      const inputBuffer = Buffer.from('original-image');

      const result = await service.applyWatermark(inputBuffer, 'image/jpeg');

      // On error, should gracefully return the original buffer
      expect(result).toEqual(inputBuffer);
    });
  });

  describe('onModuleInit', () => {
    it('should warn when watermark font file is not found', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const loggerSpy = jest.spyOn(service['logger'] || console, 'warn').mockImplementation();

      service.onModuleInit();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('font'),
      );

      loggerSpy.mockRestore();
    });
  });
});
