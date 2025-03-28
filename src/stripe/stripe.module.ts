/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionModule } from '../subscription/subsciption.module';
import { UserModule } from '../user/user.module';
import { UserSubscribesModule } from '../userSubscribes/userSubscribes.module';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    forwardRef(() => UserSubscribesModule),
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
