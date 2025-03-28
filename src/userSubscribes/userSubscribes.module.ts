/* eslint-disable prettier/prettier */
import { Module, NestModule, MiddlewareConsumer, forwardRef } from "@nestjs/common";

import { UserSubscribesService } from "./userSubscibes.service";
import { Subscription } from "../subscription/subscription.schema";

import { MongooseModule } from "@nestjs/mongoose";
import { SubscriptionSchema } from "../subscription/subscription.schema";
import { AuthMiddleware } from "src/auth/auth.middleware";
import { StripeModule } from "../stripe/stripe.module";
import { UserSubscribesController } from "./userSubscibes.controller";
import { UserSubscribe, UserSubscribeSchema } from "./userSubscribes.schema";
import { UserModule } from "../user/user.module";
import { SubscriptionModule } from "../subscription/subsciption.module";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: UserSubscribe.name, schema: UserSubscribeSchema }]),
        MongooseModule.forFeature([{ name: Subscription.name, schema: SubscriptionSchema }]),
        UserModule,
        forwardRef(() => StripeModule),
        forwardRef(() => SubscriptionModule),
    ],
    controllers: [UserSubscribesController],
    providers: [UserSubscribesService],
    exports: [UserSubscribesService]
})
export class UserSubscribesModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(AuthMiddleware).forRoutes(UserSubscribesController);
    }
}
 