/* eslint-disable prettier/prettier */
import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { UserSubscribe } from "./userSubscribes.schema";
import { Subscription } from "../subscription/subscription.schema";
import { StripeService } from "../stripe/stripe.service";

@Injectable()
export class UserSubscribesService {
    constructor(
        @InjectModel(UserSubscribe.name)
        private readonly userSubscribeModel: Model<UserSubscribe>,
        @InjectModel(Subscription.name)
        private readonly subscriptionModel: Model<Subscription>,
        @Inject(forwardRef(() => StripeService))
        private readonly stripeService: StripeService,
    ) {}

    async findAll() {
        return this.userSubscribeModel.find().exec();
    }

    async usersThatHaveSubscribed() {
        return this.userSubscribeModel.find({ status: 'active' }).populate('subscription user').exec();
    }

    async findOne(id: string) {
        return this.userSubscribeModel.findById(id).exec();
    }

    async findMySubscribe(userId: string) {
        return this.userSubscribeModel.find({ userId }).exec();
    }

    async subscribeToPlan(subscriptionId: Subscription, userId: string, stripeSubscriptionId: string) {
        const subscription = await this.subscriptionModel.findById(subscriptionId).exec();
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        
        return this.userSubscribeModel.create({
            subscription: subscriptionId,
            _id: userId,
            user: userId,
            stripeSubscriptionId,
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + subscription.duration * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    async refundSubscription(id: string) {
        const userSubscribe = await this.userSubscribeModel.findById(id).exec();
        if (userSubscribe?.stripeSubscriptionId) {
            await this.stripeService.cancelSubscription(userSubscribe.stripeSubscriptionId);
        }
        return this.userSubscribeModel.findByIdAndUpdate(id, { status: 'refunded' }).exec();
    }

    async cancelSubscription(id: string) {
        const userSubscribe = await this.userSubscribeModel.findById(id).exec();
        if (userSubscribe?.stripeSubscriptionId) {
            await this.stripeService.cancelSubscription(userSubscribe.stripeSubscriptionId);
        }
        return this.userSubscribeModel.findByIdAndUpdate(id, { status: 'cancelled' }).exec();
    }
}
    