/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  uid: string; // Firebase UID

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, enum: ['admin', 'user'], default: 'user' })
  role: string;

  @Prop({ default: [] })
  favoriteSignals: mongoose.Schema.Types.ObjectId[];

  @Prop({ default: [] })
  savedNewsAlerts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NewsAlert' }];
}

export const UserSchema = SchemaFactory.createForClass(User);
