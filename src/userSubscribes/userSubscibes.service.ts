/* eslint-disable prettier/prettier */
import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { UserSubscribe } from "./userSubscribes.schema";
import { Subscription } from "../subscription/subscription.schema";
import { StripeService } from "../stripe/stripe.service";
import { User } from "src/user/user.schema";
@Injectable()
export class UserSubscribesService {
    constructor(
        @InjectModel(UserSubscribe.name)
        private readonly userSubscribeModel: Model<UserSubscribe>,
        @InjectModel(Subscription.name)
        private readonly subscriptionModel: Model<Subscription>,
        @Inject(forwardRef(() => StripeService))
            private readonly stripeService: StripeService,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
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

    async subscribeToPlan(userId: string, priceId: string, productId: string, userEmail: string) {
        console.log("USER ID--: ", userId);
        console.log("PRICE ID:--- ", priceId);
        console.log("PRODUCT ID:--- ", productId);
        console.log("USER EMAIL:--- ", userEmail);
        const subscription = await this.subscriptionModel.findOne({ stripePriceId: priceId }).exec();
        
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        const userData = await this.userModel.findById(userId).exec();
        if (!userData) {
            throw new Error('User not found');
        }
        const userSubscribeData = await this.userSubscribeModel.findByIdAndUpdate(userId, { status: 'pending', stripeProductId: productId, stripePriceId: priceId }).exec();
        if(!userSubscribeData){
            await this.userSubscribeModel.create({
                subscription: subscription._id,
                _id: userId,
                user: userId,
                stripeProductId: productId,
                stripePriceId: priceId,
                status: 'pending',
                startDate: new Date(),
                endDate: new Date(Date.now() + subscription.duration * 24 * 60 * 60 * 1000),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        
        

        

        let customer =await this.stripeService.getCustomer(userEmail);
        console.log("CUSTOMER: ", customer);
        if(!customer){
             customer = await this.stripeService.createCustomer(userEmail);
        }
        // const subscriptionData   = await this.stripeService.createSubscription(priceId, customer.id);
        await this.userSubscribeModel.findByIdAndUpdate(userId, { stripeCustomerId: customer.id }).exec();
        const subscriptionData = await this.stripeService.createSubscription(priceId, customer.id);
        await this.userSubscribeModel.findByIdAndUpdate(userId, { stripeSubscriptionId: subscriptionData.id }).exec();
        return {
            proceedTOPaymentPage: true,
            customerId: customer.id,
            
        };
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
    