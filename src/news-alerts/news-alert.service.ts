/* eslint-disable prettier/prettier */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document, ObjectId } from 'mongoose';
import { NewsAlert, NewsAlertDocument } from './news-alert.schema';
import { ImageFormat, MulterFile, CreateNewsAlertDto } from './interfaces/news-alert.interface';
import * as AWS from 'aws-sdk';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment';
import { User, UserDocument } from '../user/user.schema';
import { RedisService } from 'src/redis/redis.service';

interface Request {
  user: {
    _id: string;
    email: string;
  };
}
  interface NewsAlertWithId extends NewsAlert {
    _id: string;
  }

@Injectable()
export class NewsAlertService {
  private readonly s3: AWS.S3;
  private readonly RAW_BUCKET: string;
  private readonly PROCESSED_BUCKET: string;

  constructor(
    @InjectModel(NewsAlert.name)
    private newsAlertModel: Model<NewsAlertDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly redisService: RedisService,
  ) {
    const rawBucket = process.env.AWS_BUCKET_NAME;
    const processedBucket = process.env.AWS_PROCESSED_BUCKET_NAME;
    
    if (!rawBucket) {
      throw new BadRequestException('AWS_BUCKET_NAME is not defined');
    }
    if (!processedBucket) {
      throw new BadRequestException('AWS_PROCESSED_BUCKET_NAME is not defined');
    }

    this.RAW_BUCKET = rawBucket;
    this.PROCESSED_BUCKET = processedBucket;

    // Initialize AWS services
    const awsConfig = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    };

    this.s3 = new AWS.S3(awsConfig);
  }

  private async uploadToRawS3(file: Buffer, key: string): Promise<string> {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.RAW_BUCKET,
      Key: key,
      Body: file,
      ACL: 'private',
    };

    try {
      const result = await this.s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(`Failed to upload to raw S3: ${error.message}`);
      }
      throw new BadRequestException('Failed to upload to raw S3');
    }
  }

  private async uploadToProcessedS3(file: Buffer, key: string): Promise<string> {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.PROCESSED_BUCKET,
      Key: key,
      Body: file,
      ACL: 'public-read',
    };

    try {
      const result = await this.s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(`Failed to upload to processed S3: ${error.message}`);
      }
      throw new BadRequestException('Failed to upload to processed S3');
    }
  }

  private async processImage(
    buffer: Buffer,
    width: number,
    quality = 80,
  ): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(width, null, { withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(`Failed to process image: ${error.message}`);
      }
      throw new BadRequestException('Failed to process image');
    }
  }

  async createNewsAlert(
    files: MulterFile[],
    data: CreateNewsAlertDto,
  ): Promise<NewsAlert> {
    const isVideo = files[0].mimetype.startsWith('video/');
    const newsAlert = new this.newsAlertModel({
      ...data,
      type: isVideo ? 'video' : 'images',
      processingStatus: 'pending',
      images: [], // Initialize empty array to bypass validation
    });

    // Save the news alert first to get an ID
    await newsAlert.save();

    try {
      if (isVideo) {
        // Upload original video to raw bucket
        const fileBuffer = await fs.promises.readFile(files[0].path);
        const key = `videos/${newsAlert._id}/original.mp4`;
        const rawUrl = await this.uploadToRawS3(fileBuffer, key);
        
        // Update news alert with raw video link
        newsAlert.rawAwsLinkVideo = rawUrl;
        await newsAlert.save();
        
        // Cleanup temp file
        await fs.promises.unlink(files[0].path);
      } else {
        // Upload images to raw bucket
        const rawUrls = await Promise.all(
          files.map(async (file) => {
            const fileBuffer = await fs.promises.readFile(file.path);
            const key = `images/${newsAlert._id}/${path.basename(file.path)}`;
            const rawUrl = await this.uploadToRawS3(fileBuffer, key);
            
            // Cleanup temp file
            await fs.promises.unlink(file.path);
            
            return rawUrl;
          })
        );

        // Update news alert with raw image links
        newsAlert.rawAwsLinkImages = rawUrls;
        await newsAlert.save();
      }

      return newsAlert;
    } catch (error) {
      console.error('Error uploading to raw bucket:', error);
      throw new BadRequestException('Failed to upload media');
    }
  }

  async findAll(filter: { isLive?: boolean } = {}): Promise<NewsAlert[]> {
    
    if(await this.redisService.exists('news_alerts')){
      const newsAlerts = await this.redisService.get('news_alerts');
      return newsAlerts as NewsAlert[];
    }
    const newsAlerts = await this.newsAlertModel.find(filter).sort({ createdAt: -1 }).exec();
    await this.redisService.set('news_alerts', newsAlerts);

    await    this.redisService.set('news_alerts', newsAlerts);
    return newsAlerts as NewsAlert[];
  }

  async findAllList(): Promise<NewsAlert[]> {
    if(await this.redisService.exists('news_alerts_list')){
      const newsAlerts = await this.redisService.get('news_alerts_list');
      return newsAlerts as NewsAlert[];
    }
    const newsAlerts = await this.newsAlertModel.find().sort({ createdAt: -1 }).exec();
    await this.redisService.set('news_alerts_list', newsAlerts);
    return newsAlerts as NewsAlert[];
  }
  
  async findAllListByYou(request: Request): Promise<NewsAlert[]> {
    if(await this.redisService.exists('news_alerts_list_by_you')){
      const newsAlerts = await this.redisService.get('news_alerts_list_by_you');
      return newsAlerts as NewsAlert[];
    }
    console.log("request",request.user, request.user.email);
    const user = request.user;
    if (!user?.email) {
      throw new BadRequestException('User not found');
    }
    const newsAlerts = await this.newsAlertModel.find({ createdBy: user.email, isDeleted: false }).sort({ createdAt: -1 }).exec();
    await this.redisService.set('news_alerts_list_by_you', newsAlerts);
    return newsAlerts as NewsAlert[];
  }

  async findAllProfileReels(filter: { createdBy: string }): Promise<NewsAlert[]> {
    if(await this.redisService.exists('news_alerts_profile_reels')){
      const newsAlerts = await this.redisService.get('news_alerts_profile_reels');
        return newsAlerts as NewsAlert[];
    }
    const newsAlerts = await this.newsAlertModel.find(filter).sort({ createdAt: -1 }).exec();
    await this.redisService.set('news_alerts_profile_reels', newsAlerts);
    return newsAlerts as NewsAlert[];
  }

  async findById(id: string): Promise<NewsAlert | null> {
    if(await this.redisService.exists('news_alerts_by_id')){
      const newsAlert = await this.redisService.get('news_alerts_by_id');
        return newsAlert as NewsAlert;
    }
    const newsAlert = await this.newsAlertModel.findById(id).exec();
    await this.redisService.set('news_alerts_by_id', newsAlert);
    return newsAlert as NewsAlert;
  }

  async findAllPaginated(page: number, limit: number): Promise<NewsAlert[]> {
    const cacheKey = 'news_alerts_paginated';
    let newsAlerts: NewsAlert[] = [];

    if (await this.redisService.exists(cacheKey)) {
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        newsAlerts = JSON.parse(cachedData as string) as NewsAlert[];
      }
    } else {
      newsAlerts = await this.newsAlertModel.find({ isLive: true }).sort({ createdAt: -1 }).exec();
      await this.redisService.set(cacheKey, JSON.stringify(newsAlerts));
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit; 
    const paginatedNewsAlerts = newsAlerts.slice(startIndex, endIndex);

    return paginatedNewsAlerts;
  }



  async toggleIsLive(id: string): Promise<NewsAlertWithId> {
    const cacheKey = 'news_alerts_paginated';

    if (await this.redisService.exists(cacheKey)) {
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        const newsAlerts = JSON.parse(cachedData as string) as NewsAlertWithId[];
        const newsAlert = newsAlerts.find(alert => alert._id === id); // Use '_id' instead of 'id'
        if (newsAlert) {
          newsAlert.isLive = !newsAlert.isLive;
          await this.redisService.set(cacheKey, JSON.stringify(newsAlerts));
          return newsAlert;
        }
      }
    }

    const newsAlert = await this.newsAlertModel.findById(id);
    if (!newsAlert) {
      throw new BadRequestException('News alert not found');
    }
    newsAlert.isLive = !newsAlert.isLive;
    await newsAlert.save();
    return newsAlert as NewsAlertWithId;
  }

  async getPartiallyDeletedNewsAlerts(): Promise<NewsAlert[]> {
    return this.newsAlertModel.find({ isDeleted: true }).exec();
  }

  async getMyPartiallyDeletedNewsAlerts(request: Request): Promise<NewsAlert[]> {
    const user = request.user;
    if (!user?.email) {
      throw new BadRequestException('User not found');
    }
    return this.newsAlertModel.find({ createdBy: user.email, isDeleted: true }).exec();
  }

  async deleteNewsAlertCompletely(id: string): Promise<string> {
    const newsAlert = await this.newsAlertModel.findByIdAndDelete(id);
    if(!newsAlert){
      throw new BadRequestException('News alert not found');
    }
    return 'News alert deleted successfully';
    
  }
  

  async deleteNewsAlertPartially(id: string): Promise<string> {
    const newsAlert = await this.newsAlertModel.findByIdAndUpdate(id, { isLive: false, isDeleted: true });
    if(!newsAlert){
      throw new BadRequestException('News alert not found');
    }
    return 'News alert deleted successfully';
  }

  async recoverPartiallyDeletedNewsAlerts(id: string): Promise<NewsAlert> {
    const newsAlert = await this.newsAlertModel.findByIdAndUpdate(id, { isLive: false, isDeleted: false });
    if(!newsAlert){
      throw new BadRequestException('News alert not found');
    }
    return newsAlert;
  }

  async saveNewsAlert(request: Request, newsAlertId: string): Promise<User> {
    const user = await this.userModel.findById(request.user._id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    user.savedNewsAlerts.push({ type: newsAlertId as unknown as ObjectId, ref: 'NewsAlert' });
    await user.save();
    return user;
  }

  async unsaveNewsAlert(request: Request, newsAlertId: string): Promise<User> {
    const user = await this.userModel.findById(request.user._id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    user.savedNewsAlerts = user.savedNewsAlerts.filter((alert) => alert.type.toString() !== newsAlertId);
    await user.save();
    return user;
  }
}
