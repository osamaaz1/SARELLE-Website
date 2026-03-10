import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class WatermarkService implements OnModuleInit {
  private readonly logger = new Logger(WatermarkService.name);
  private fontBase64 = '';

  onModuleInit() {
    const candidates = [
      join(__dirname, '..', 'assets', 'fonts', 'PlayfairDisplay-Bold.ttf'),
      join(process.cwd(), 'src', 'assets', 'fonts', 'PlayfairDisplay-Bold.ttf'),
      join(process.cwd(), 'dist', 'src', 'assets', 'fonts', 'PlayfairDisplay-Bold.ttf'),
    ];

    for (const fontPath of candidates) {
      if (existsSync(fontPath)) {
        try {
          const fontBuffer = readFileSync(fontPath);
          this.fontBase64 = fontBuffer.toString('base64');
          this.logger.log(`Playfair Display Bold font loaded from ${fontPath}`);
          return;
        } catch {}
      }
    }

    this.logger.warn('Could not load Playfair Display font — watermark will use fallback font');
  }

  async applyWatermark(buffer: Buffer, mimeType: string): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 600;

      const fontSize = Math.max(16, Math.round(width * 0.04));
      const paddingX = Math.round(width * 0.03);
      const paddingY = Math.round(height * 0.03);

      const fontFace = this.fontBase64
        ? `@font-face { font-family: 'Playfair'; src: url(data:font/truetype;base64,${this.fontBase64}); }`
        : '';
      const fontFamily = this.fontBase64 ? 'Playfair' : 'Georgia, serif';

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><style>${fontFace}</style></defs>
  <text
    x="${width - paddingX}"
    y="${height - paddingY}"
    text-anchor="end"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    font-weight="bold"
    fill="rgba(255,255,255,0.35)"
    letter-spacing="1"
  >WIMC</text>
</svg>`;

      let output = image.composite([
        { input: Buffer.from(svg), top: 0, left: 0 },
      ]);

      if (mimeType === 'image/png') {
        output = output.png({ quality: 90 });
      } else if (mimeType === 'image/webp') {
        output = output.webp({ quality: 90 });
      } else {
        output = output.jpeg({ quality: 90 });
      }

      return await output.toBuffer();
    } catch (err) {
      this.logger.error(`Watermark failed, returning original: ${err.message}`);
      return buffer;
    }
  }
}
