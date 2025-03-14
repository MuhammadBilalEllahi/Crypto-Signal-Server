/* eslint-disable prettier/prettier */
import { Readable } from 'stream';

export interface VideoFormats {
  '480p': string;
  '720p': string;
  '1080p': string;
  thumbnail: string;
}

export interface ImageFormat {
  original: string;
  thumbnail: string;
  medium: string;
  large: string;
}

export interface CreateNewsAlertDto {
  title: string;
  description: string;
  contentType: 'crypto' | 'stocks' | 'gold';
  type?: 'video' | 'images';
  createdBy: string;
}

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
  stream?: Readable;
}
