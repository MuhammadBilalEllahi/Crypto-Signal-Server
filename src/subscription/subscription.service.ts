/* eslint-disable prettier/prettier */
  import { BadRequestException, Injectable,  NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription } from './subscription.schema';
import { StripeService, StripeSubscription } from '../stripe/stripe.service';
// import { AdminMiddleware } from 'src/auth/admin.middleware';
// import { AuthMiddleware } from 'src/auth/auth.middleware';


@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,
    private stripeService: StripeService,
  ) {}  




  getLiveSubscriptions() {
    return this.subscriptionModel.find({ isInActive: false, isDeleted: false }).exec();
  }

  // @UseGuards(AdminMiddleware)
  async findAll(): Promise<Subscription[]> {
    return this.subscriptionModel.find().exec();
  }
  
  // @UseGuards(AuthMiddleware)
  async findOneById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionModel.findById(id).exec();
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }

  // @UseGuards(AdminMiddleware)
  async create(subscription: Subscription): Promise<Subscription> {

    const existingSubscription = await this.subscriptionModel.findOne({ name: subscription.name }).exec();
    if (existingSubscription) {
      throw new BadRequestException('Subscription Name already exists');
    }
    const stripeProduct = await this.stripeService.createProduct(subscription.name,  subscription.price,subscription.currency,
      subscription.description,subscription.durationType,
      // subscription.duration,
      subscription.marketingFeatures);
    console.log("stripeProduct", stripeProduct);
    subscription.stripeProductId = stripeProduct.id;
    return this.subscriptionModel.create(subscription);
  }

//   This has its own consequences
// @UseGuards(AdminMiddleware)
  async update(id: string, subscription: Subscription): Promise<Subscription> {
    const updatedSubscription = await this.subscriptionModel.findByIdAndUpdate(id, subscription, { new: true }).exec();
    if (!updatedSubscription) {
      throw new NotFoundException('Subscription not found');
    }
    return updatedSubscription;
  }
}
