import { Injectable } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
  uploadLogo(file: Express.Multer.File): { url: string } {
    return { url: `/uploads/${file.filename}` };
  }

  deleteOldLogo(url: string): void {
    if (!url || !url.startsWith('/uploads/')) return;
    const filePath = join(process.cwd(), url);
    if (existsSync(filePath)) {
      try { unlinkSync(filePath); } catch { /* ignore */ }
    }
  }
}
