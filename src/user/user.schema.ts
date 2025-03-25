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

  @Prop({ default: 'user' })
  role: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  twoFactorEnabled?: boolean;

  @Prop()
  twoFactorSecret?: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop({ default: [] })
  favoriteSignals: mongoose.Schema.Types.ObjectId[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NewsAlert' }], default: [] })
  savedNewsAlerts: { type: mongoose.Schema.Types.ObjectId; ref: 'NewsAlert' }[];
  
  
  // @Prop({ default: [] })
  // savedSignals: mongoose.Schema.Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
