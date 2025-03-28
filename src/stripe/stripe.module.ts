/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionModule } from '../subscription/subsciption.module';

@Module({
  imports: [ConfigModule, SubscriptionModule],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
