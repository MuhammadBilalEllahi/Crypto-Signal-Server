/* eslint-disable prettier/prettier */
import { forwardRef, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { SubscriptionController } from "./subscription.controller";
import { AuthMiddleware } from "src/auth/auth.middleware";
import { SubscriptionService } from "./subscription.service";
import { Subscription, SubscriptionSchema } from "./subscription.schema";
import { MongooseModule } from "@nestjs/mongoose";
import { UserModule } from "../user/user.module";
import { StripeModule } from "../stripe/stripe.module";
// import { AdminMiddleware } from "src/auth/admin.middleware";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Subscription.name, schema: SubscriptionSchema }]),
        forwardRef(() => StripeModule),
        UserModule,
        
    ],
    providers: [SubscriptionService],
    controllers: [SubscriptionController],
    exports: [SubscriptionService]
})
export class SubscriptionModule implements NestModule{
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(AuthMiddleware).forRoutes(SubscriptionController);
        // consumer.apply(AdminMiddleware).forRoutes(SubscriptionController);
    }
}
