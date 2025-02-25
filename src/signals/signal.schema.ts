import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Signal extends Document {
  @Prop({ required: true }) coin: string;
  @Prop({ required: true }) direction: 'Long' | 'Short';
  @Prop({ required: true }) portfolioPercentage: number;
  @Prop({ required: true }) entryPrice: number;
  @Prop({ required: true }) exitPrice: number;
  @Prop({ required: true }) gainLossPercentage: number;
  @Prop({ required: true, default: Date.now }) createdAt: Date;
  @Prop({ required: true }) expireAt: Date;
  @Prop({ required: true, default: false }) expired: boolean;
}

export const SignalSchema = SchemaFactory.createForClass(Signal);
