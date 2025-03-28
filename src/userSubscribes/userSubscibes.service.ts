/* eslint-disable prettier/prettier */
import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { UserSubscribe } from "./userSubscribes.schema";
import { Subscription } from "../subscription/subscription.schema";


@Injectable()
export class UserSubscribesService {
    constructor(private readonly userSubscribeModel: Model<UserSubscribe>, private readonly subscriptionModel: Model<Subscription>  ) {}

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

    async subscribeToPlan(subscriptionId: Subscription, userId: string) {

        const subscription = await this.subscriptionModel.findById(subscriptionId).exec();
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        
        return this.userSubscribeModel.create({
            subscription: subscriptionId,
           _id: userId,
           user: userId,
        });
    }

    async refundSubscription(id: string) {
        return this.userSubscribeModel.findByIdAndUpdate(id, { status: 'refunded' }).exec();
    }

    async cancelSubscription(id: string) {
        return this.userSubscribeModel.findByIdAndUpdate(id, { status: 'cancelled' }).exec();
    }
    
}
    