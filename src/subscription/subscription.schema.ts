/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

export enum SubscriptionDuration {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONETIME = 'onetime'
}

@Schema()
export class Subscription {
  @Prop({ required: true })
  stripeProductId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true, enum: SubscriptionDuration })
  durationType: SubscriptionDuration;

  @Prop({ required: true })
  marketingFeatures: string[];

  @Prop({ default: false })
  isInActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  disableForUser: boolean;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
