import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { StorageService } from './storage.service';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('submission-photos/:submissionId')
  @UseInterceptors(FilesInterceptor('photos', 8))
  async uploadSubmissionPhotos(
    @Param('submissionId') submissionId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No photos provided');
    }

    for (const file of files) {
      this.storageService.validateFile(file, 5);
    }

    const folder = `submissions/${req.user.id}/${submissionId}`;
    const urls = await this.storageService.uploadFiles('wimc-listings', folder, files);

    return { urls };
  }

  @Post('listing-photos/:submissionId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(FilesInterceptor('photos', 12))
  async uploadListingPhotos(
    @Param('submissionId') submissionId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No photos provided');
    }

    for (const file of files) {
      this.storageService.validateFile(file, 5);
    }

    const folder = submissionId;
    const urls = await this.storageService.uploadFilesWithWatermark('wimc-listings', folder, files);

    return { urls };
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No avatar file provided');
    }

    this.storageService.validateFile(file, 2);

    const folder = req.user.id;
    const url = await this.storageService.uploadFile('wimc-avatars', folder, file);

    return { url };
  }

  @Post('celebrity-avatar/:celebrityId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadCelebrityAvatar(
    @Param('celebrityId') celebrityId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No avatar file provided');
    }

    this.storageService.validateFile(file, 2);

    const folder = `celebrities/${celebrityId}`;
    const url = await this.storageService.uploadFile('wimc-avatars', folder, file);

    return { url };
  }
}
