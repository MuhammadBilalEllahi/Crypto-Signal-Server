/* eslint-disable prettier/prettier */
import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { UserSubscribesController } from "./userSubscibes.controller";
import { UserSubscribesService } from "./userSubscibes.service";
        import { Subscription } from "../subscription/subscription.schema";
import { UserSubscribe, UserSubscribeSchema } from "./userSubscribes.schema";
import { MongooseModule } from "@nestjs/mongoose";
import { SubscriptionSchema } from "../subscription/subscription.schema";
import { AuthMiddleware } from "src/auth/auth.middleware";

@Module({
    controllers: [UserSubscribesController],
    providers: [UserSubscribesService],
    imports: [
        MongooseModule.forFeature([{ name: UserSubscribe.name, schema: UserSubscribeSchema }]),
        MongooseModule.forFeature([{ name: Subscription.name, schema: SubscriptionSchema }]),
    ],
    exports: [UserSubscribesService]
})
export class UserSubscribesModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(AuthMiddleware).forRoutes(UserSubscribesController);
    }
}
 