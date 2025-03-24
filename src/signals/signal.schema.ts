/* eslint-disable prettier/prettier */
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Signal extends Document {
  @Prop({
    validate: {
      validator: function(this: Signal) {
        console.log("this.type", this.type);
        return !(this.type === 'GOLD' && this.coin); // Return false if type is GOLD and coin exists
      },
      message: "Coin should be null or undefined if type is 'GOLD'."
    }
  })
  coin?: string;
  @Prop({ required: true, uppercase: true }) type: 'GOLD' | 'CRYPTO' | 'STOCKS';
  @Prop({ required: true }) createdBy: string;
  @Prop({ required: true, uppercase: true }) direction: 'LONG' | 'SHORT';
  @Prop({ required: true }) portfolioPercentage: number;
  @Prop({ required: true }) entryPrice: number;
  @Prop({ required: true }) exitPrice: number;
  @Prop({ required: true }) gainLossPercentage: number;
  @Prop({ required: true, default: Date.now }) createdAt: Date;
  @Prop({ required: true }) expireAt: Date;
  @Prop({ default: false }) expired: boolean;
  @Prop({ default: Date.now }) timestamp: Date;
  @Prop({ default: false }) isLive: boolean;
  @Prop({ default: false }) hasTradingAnalysis: boolean;
  @Prop({ default: false }) tradingAnalysis: string;
  @Prop({ default: false }) isDeleted: boolean;
  @Prop({ default: 'spot-free' }) subscriptionValue: 'spot-free' | 'spot-paid' | 'future-free' | 'future-paid';
}

export const SignalSchema = SchemaFactory.createForClass(Signal);
