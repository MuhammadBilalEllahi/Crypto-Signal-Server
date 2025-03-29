/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { SubscriptionDuration } from '../subscription/subscription.schema';
import { UserSubscribe } from '../userSubscribes/userSubscribes.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

export interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  currentPeriodEnd: number;
  items: Array<{
    price: {
      id: string;
      unit_amount: number;
      currency: string;
    };
    product: {
      id: string;
      name: string;
      description: string;
      metadata: {
        features?: string;
        marketingFeatures?: string;
      };
    };
  }>;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService, @InjectModel(UserSubscribe.name) private userSubscribeModel: Model<UserSubscribe>) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async listProducts(): Promise<Stripe.Product[]> {
    const products = await this.stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });
    return products.data;
  }

  async listPrices(): Promise<Stripe.Price[]> {
    const prices = await this.stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });
    console.log("______[listPrices]prices", prices);
    return prices.data;
  }

  async listPricesAndCheckUserSubscribe(_id: string): Promise<{data: Stripe.Price[], message: string, subscribedPlanId?: string, subscribedProductId?: string}> {
    const userSubscribes = await this.userSubscribeModel.findById(_id);
    let message = 'notSubscribed';
    let subscribedPlanId: string | undefined = undefined;
    let subscribedProductId: string | undefined = undefined;

    if (userSubscribes && userSubscribes.status === 'active') {
      message = 'alreadySubscribed';
      subscribedPlanId = userSubscribes.stripePriceId; 
      subscribedProductId = userSubscribes.stripeProductId; 
    }

    const prices = await this.stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });
    console.log("______[listPrices]prices", prices);
    return {data: prices.data, message, subscribedPlanId, subscribedProductId};
  }

  async listSubscriptions(): Promise<StripeSubscription[]> {
    const subscriptions = await this.stripe.subscriptions.list({
      expand: ['data.customer', 'data.items.data.price'],
    });

    console.log("subscriptions", subscriptions);
    return subscriptions.data.map(subscription => ({
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer as string,
      currentPeriodEnd: subscription.current_period_end,
      items: subscription.items.data.map(item => ({
        price: {
          id: item.price.id,
          unit_amount: (item.price).unit_amount || 0,
          currency: (item.price).currency,
        },
        product: {
          id: (item.price).product as string,
          name: ((item.price).product as Stripe.Product).name,
          description: ((item.price).product as Stripe.Product).description || '',
          metadata: ((item.price).product as Stripe.Product).metadata,
        },
      })),
    }));
  }

  async createSubscription(priceId: string, customerId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async getCustomer(email: string): Promise<Stripe.Customer> {
    const customers = await this.stripe.customers.list({ email });
    return customers.data[0];
  }

  async createCustomer(email: string): Promise<Stripe.Customer> {
    return await this.stripe.customers.create({
      email,
    });
  }

  async createPrice(amount: number, currency: string, productId: string, durationType: SubscriptionDuration): Promise<Stripe.Price> {
    const priceData: Stripe.PriceCreateParams = {
      unit_amount: amount * 100, // Convert to cents
      currency,
      product: productId,
    };

    if (durationType !== SubscriptionDuration.ONETIME) {
      priceData.recurring = {
        interval: durationType === SubscriptionDuration.MONTHLY ? 'month' : 'year',
        interval_count: durationType === SubscriptionDuration.YEARLY ? 1 : undefined,
      };
    }

    return await this.stripe.prices.create(priceData);
  }

  async createProduct(
    name: string,
    price: number,
    currency: string,
    description: string,
    durationType: SubscriptionDuration,
    marketingFeatures: string[],
    disableForUser: boolean,
  ): Promise<Stripe.Product> {
    const productData: Stripe.ProductCreateParams = {
      name,
      description,
      // marketing_features: marketingFeatures.join(','),
      metadata: {
        marketingFeatures: marketingFeatures.join(','),
        disableForUser: disableForUser.toString(),
      },
      default_price_data: {
        unit_amount: price * 100, // Convert to cents
        currency,
        recurring: durationType !== SubscriptionDuration.ONETIME ? {
          interval: durationType === SubscriptionDuration.MONTHLY ? 'month' : 'year',
          interval_count: durationType === SubscriptionDuration.YEARLY ? 1 : undefined,
        } : undefined,
      },
      active: disableForUser, // If disableForUser is true, the product will be inactive
    };

    return await this.stripe.products.create(productData);
  }

  async updateProduct(productId: string, data: Stripe.ProductUpdateParams): Promise<Stripe.Product> {
    return await this.stripe.products.update(productId, data);
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.cancel(subscriptionId);
  }

  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.retrieve(subscriptionId);
  }
}
