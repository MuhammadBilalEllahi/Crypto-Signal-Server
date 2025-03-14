/* eslint-disable prettier/prettier */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NewsAlert, NewsAlertDocument } from './news-alert.schema';
import { ImageFormat, MulterFile, CreateNewsAlertDto } from './interfaces/news-alert.interface';
import * as AWS from 'aws-sdk';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NewsAlertService {
  private readonly s3: AWS.S3;
  private readonly RAW_BUCKET: string;
  private readonly PROCESSED_BUCKET: string;

  constructor(
    @InjectModel(NewsAlert.name)
    private newsAlertModel: Model<NewsAlertDocument>,
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
      processingStatus: 'pending'
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
        
        return newsAlert;
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

        return newsAlert;
      }
    } catch (error) {
      console.error('Error uploading to raw bucket:', error);
      throw new BadRequestException('Failed to upload media');
    }
  }

  async toggleLiveStatus(id: string): Promise<NewsAlert> {
    const newsAlert = await this.newsAlertModel.findById(id);
    if (!newsAlert) {
      throw new BadRequestException('News alert not found');
    }

    newsAlert.isLive = !newsAlert.isLive;
    return newsAlert.save();
  }

  async findAll(filter: { isLive?: boolean } = {}): Promise<NewsAlert[]> {
    return this.newsAlertModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<NewsAlert | null> {
    return this.newsAlertModel.findById(id).exec();
  }

  async findAllPaginated(page: number, limit: number): Promise<NewsAlert[]> {
    const skip = (page - 1) * limit;
    return this.newsAlertModel.find({ isLive: true }).sort({ createdAt: -1}).skip(skip).limit(limit).exec();
  }
}
