/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { UserSubscribe, UserSubscribeDocument } from 'src/userSubscribes/userSubscribes.schema';

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

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop({ default: false })
  twoFactorVerified: boolean;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  twoFactorSecret?: string;

  @Prop({ default: false })
  generated2FA: boolean;

  @Prop({ default: [] })
  favoriteSignals: mongoose.Schema.Types.ObjectId[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NewsAlert' }], default: [] })
  savedNewsAlerts: {type:mongoose.Schema.Types.ObjectId, ref:'NewsAlert'}[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'UserSubscribe' })
  defaultUserSubscribe: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'UserSubscribe' })
  userSubscribe: mongoose.Schema.Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre<UserDocument>('save', async function (next) {
  if (this.isNew) {
    const defaultUserSubscribe = await mongoose.model<UserSubscribeDocument>('UserSubscribe').findOne({ name: 'Free' });
    if (defaultUserSubscribe) {
      this.defaultUserSubscribe = defaultUserSubscribe._id;
    }
  }
  next();
});



