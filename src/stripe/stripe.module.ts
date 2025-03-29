/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionModule } from '../subscription/subsciption.module';
import { UserModule } from '../user/user.module';
import { UserSubscribesModule } from '../userSubscribes/userSubscribes.module';
import { UserSubscribe } from '../userSubscribes/userSubscribes.schema';
import { UserSubscribeSchema } from '../userSubscribes/userSubscribes.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    forwardRef(() => UserSubscribesModule),
    forwardRef(() => SubscriptionModule),
    MongooseModule.forFeature([{ name: UserSubscribe.name, schema: UserSubscribeSchema }]),
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
