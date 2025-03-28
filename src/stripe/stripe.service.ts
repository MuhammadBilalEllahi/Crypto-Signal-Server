/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

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
    };
  }>;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async listSubscriptions(): Promise<StripeSubscription[]> {
    const subscriptions = await this.stripe.subscriptions.list({
      expand: ['data.customer', 'data.items.data.price.product'],
    });

    return subscriptions.data.map(subscription => ({
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer as string,
      currentPeriodEnd: subscription.current_period_end,
      items: subscription.items.data.map(item => ({
        price: {
          id: item.price.id,
          unit_amount: (item.price as Stripe.Price).unit_amount || 0,
          currency: (item.price as Stripe.Price).currency,
        },
        product: {
          id: (item.price as Stripe.Price).product as string,
          name: ((item.price as Stripe.Price).product as Stripe.Product).name,
          description: ((item.price as Stripe.Price).product as Stripe.Product).description || '',
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

  async createCustomer(email: string): Promise<Stripe.Customer> {
    return await this.stripe.customers.create({
      email,
    });
  }

  async createPrice(amount: number, currency: string, productId: string): Promise<Stripe.Price> {
    return await this.stripe.prices.create({
      unit_amount: amount * 100, // Convert to cents
      currency,
      product: productId,
      recurring: {
        interval: 'month',
      },
    });
  }

  async createProduct(name: string, description: string): Promise<Stripe.Product> {
    return await this.stripe.products.create({
      name,
      description,
    });
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
