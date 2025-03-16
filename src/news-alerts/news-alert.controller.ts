/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UseGuards,
  Patch,
  Query,
  Put,
  Req,
  Delete,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { NewsAlertService } from './news-alert.service';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { CreateNewsAlertDto } from './interfaces/news-alert.interface';
import { NewsAlert } from './news-alert.schema';
import { AdminMiddleware } from 'src/auth/admin.middleware';
import { User } from 'src/user/user.schema';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Controller('news-alerts')
// @UseGuards(AdminMiddleware)
export class NewsAlertController {
  constructor(private readonly newsAlertService: NewsAlertService) {}

  @Post('admin/upload')
  @UseInterceptors(
    FilesInterceptor('files', 7, {
      storage: diskStorage({
        destination: './temp/uploads',
        filename: (_req, file: MulterFile, cb: (error: Error | null, filename: string) => void) => {
          const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (_req, file: MulterFile, cb: (error: Error | null, acceptFile: boolean) => void) => {
        const allowedMimetypes = [
          'video/mp4',
          'video/quicktime',
          'video/mov',
          'video/avi',
          'video/webm',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (!allowedMimetypes.includes(file.mimetype)) {
          cb(
            new BadRequestException(
              'Only .mp4, .mov, .jpg, and .png files are allowed',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
    }),
  )
  async uploadNewsAlert(
    @UploadedFiles() files: MulterFile[],
    @Body() data: CreateNewsAlertDto,
  ): Promise<NewsAlert> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const isVideo = files[0].mimetype.startsWith('video/');

    // Validate file count based on type
    if (isVideo && files.length > 1) {
      throw new BadRequestException('Only one video file is allowed');
    }

    if (!isVideo && files.length > 7) {
      throw new BadRequestException('Maximum 7 images are allowed');
    }

    return this.newsAlertService.createNewsAlert(files, data);
  }



  @UseGuards(AdminMiddleware)
  @Get('admin/all/list')
  async allNewsAlerts(): Promise<NewsAlert[]> {
    return this.newsAlertService.findAllList();
  }

  @UseGuards(AdminMiddleware)
  @Get('admin/my/list')
  async myNewsAlerts(@Req() req: Request & { user: any }): Promise<NewsAlert[]> {
    console.log("This is the request",req.user);
    return this.newsAlertService.findAllListByYou(req);
  }

 


  @UseGuards(AdminMiddleware)
  @Get('admin/toggle-isLive/:newsAlertId')
  async toggleIsLive(@Param('newsAlertId') newsAlertId: string): Promise<NewsAlert> {
    return this.newsAlertService.toggleIsLive(newsAlertId);
  }

  @UseGuards(AdminMiddleware)
  @Delete('admin/delete-partially/:newsAlertId')
  async deletePartially(@Param('newsAlertId') newsAlertId: string): Promise<string> {
    return this.newsAlertService.deleteNewsAlertPartially(newsAlertId);
  }

  
  @UseGuards(AdminMiddleware)
  @Delete('admin/permanently-delete/:newsAlertId')
  async deleteMedia(@Param('newsAlertId') newsAlertId: string): Promise<string> {
    return this.newsAlertService.deleteNewsAlertCompletely(newsAlertId);
  }

  @Put('admin/save/:newsAlertId')
  async saveNewsAlert(@Param('newsAlertId') newsAlertId: string, @Req() req: Request & { user: any }): Promise<User> {
    return this.newsAlertService.saveNewsAlert(req, newsAlertId);
  }

  @Put('admin/unsave/:newsAlertId')
  async unsaveNewsAlert(@Param('newsAlertId') newsAlertId: string, @Req() req: Request & { user: any }): Promise<User> {
    return this.newsAlertService.unsaveNewsAlert(req, newsAlertId);
  }

  @UseGuards(AdminMiddleware)
  @Get('admin/partially-deleted-news-alerts')
  async getPartiallyDeletedNewsAlerts(): Promise<NewsAlert[]> {
    return this.newsAlertService.getPartiallyDeletedNewsAlerts();
  }

  @UseGuards(AdminMiddleware)
  @Get('admin/my-partially-deleted-news-alerts')
  async getMyPartiallyDeletedNewsAlerts(@Req() req: Request & { user: any }): Promise<NewsAlert[]> {
    return this.newsAlertService.getMyPartiallyDeletedNewsAlerts(req);
  }

  @UseGuards(AdminMiddleware)
  @Get('admin/recover-partially-deleted-news-alerts/:newsAlertId')
  async recoverPartiallyDeletedNewsAlerts(@Param('newsAlertId') newsAlertId: string): Promise<NewsAlert> {
    return this.newsAlertService.recoverPartiallyDeletedNewsAlerts(newsAlertId);
  }



  
  @Get('all-paginated')
  async findAllPaginated(@Query('page') page: number = 1, @Query('limit') limit: number = 10): Promise<NewsAlert[]> {
    return this.newsAlertService.findAllPaginated(page, limit);
  }

  @Get()
  async findAll(@Query('isLive') isLive?: boolean): Promise<NewsAlert[]> {
    const filter = isLive !== undefined ? { isLive } : {};
    return this.newsAlertService.findAll(filter);
  }

  @Get('live')
  async findLive(): Promise<NewsAlert[]> {
    return this.newsAlertService.findAll({ isLive: true });
  }

  @Get('admin/profile/reels')
  async findProfileReels(@Query('createdBy') createdBy: string): Promise<NewsAlert[]> {
    return this.newsAlertService.findAllProfileReels({ createdBy: createdBy });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<NewsAlert> {
    const newsAlert = await this.newsAlertService.findById(id);
    if (!newsAlert) {
      throw new BadRequestException('News alert not found');
    }
    return newsAlert;
  }
 
}
