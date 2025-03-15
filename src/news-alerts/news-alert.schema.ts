/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NewsAlertDocument = NewsAlert & Document;

@Schema({ timestamps: true })
export class NewsAlert {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['video', 'images'] })
  type: string;

  @Prop({ required: true, enum: ['crypto', 'stocks', 'gold'] })
  contentType: string;

  @Prop({ default: false })
  isLive: boolean;

  @Prop()
  rawAwsLinkVideo: string;

  @Prop({ type: [String], default: [] })
  rawAwsLinkImages: string[];

  @Prop({
    type: {
      '480p': String,
      '720p': String,
      '1080p': String,
      thumbnail: String,
    }
  })
  videoFormats: {
    '480p': string;
    '720p': string;
    '1080p': string;
    thumbnail: string;
  };

  @Prop({
    type: [{
      original: String,
      thumbnail: String,
      medium: String,
      large: String,
    }],
    validate: {
      validator: function (this: NewsAlert, images: any[]) {
        // Skip validation if processing is pending
        if (this.processingStatus === 'pending') return true;
        
        if (this.type === 'images') {
          return images && images.length > 0 && images.length <= 7;
        }
        return true;
      },
      message: 'Images must be between 1 and 7',
    },
  })
  images: Array<{
    original: string;
    thumbnail: string;
    medium: string;
    large: string;
  }>;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  comments: number;

  @Prop({
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  })
  processingStatus: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const NewsAlertSchema = SchemaFactory.createForClass(NewsAlert);
