/* eslint-disable prettier/prettier */
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsAlertController } from './news-alert.controller';
import { NewsAlertService } from './news-alert.service';
import { NewsAlert, NewsAlertSchema } from './news-alert.schema';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { AuthMiddleware } from 'src/auth/auth.middleware';
import { UserModule } from 'src/user/user.module';
import { User, UserSchema } from 'src/user/user.schema';
import { RedisModule } from 'src/redis/redis.module';

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

const TEMP_UPLOAD_DIR = './temp/uploads';

// Ensure temp upload directory exists
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: NewsAlert.name, schema: NewsAlertSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: TEMP_UPLOAD_DIR,
        filename: (_req: any, file: MulterFile, cb: (error: Error | null, filename: string) => void) => {
          const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
    }),
    RedisModule,
  ],
  controllers: [NewsAlertController],
  providers: [NewsAlertService],
  exports: [NewsAlertService],
})
export class NewsAlertModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(NewsAlertController);
    // consumer.apply(AdminMiddleware).forRoutes({ path: 'news-alerts/admin/create', method: RequestMethod.POST });
  }
}
