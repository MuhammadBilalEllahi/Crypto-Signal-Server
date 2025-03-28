/* eslint-disable prettier/prettier */
import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { StripeService, StripeSubscription } from './stripe.service';
import { AuthMiddleware } from '../auth/auth.middleware';
import { UserSubscribesService } from '../userSubscribes/userSubscibes.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { AdminMiddleware } from '../auth/admin.middleware';

interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    uid: string;
    email: string;
  };
}

interface CreateSubscriptionDto {
  priceId: string;
  subscriptionId: string;
}

interface CancelSubscriptionDto {
  subscriptionId: string;
}

interface CreatePlanDto {
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
}

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly userSubscribesService: UserSubscribesService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @UseGuards(AdminMiddleware)
  @Get('subscriptions')
  async getStripeSubscriptions(): Promise<StripeSubscription[]> {
    return await this.stripeService.listSubscriptions();
  }

  @UseGuards(AdminMiddleware)
  @Post('create-plan')
  async createPlan(@Body() body: CreatePlanDto) {
    // Create product in Stripe
    const product = await this.stripeService.createProduct(
      body.name,
      body.description,
    );

    // Add features as metadata
    await this.stripeService.updateProduct(product.id, {
      metadata: {
        features: body.features.join(','),
      },
    });

    // Create price for the product
    const price = await this.stripeService.createPrice(
      body.price,
      body.currency,
      product.id,
    );

    return {
      productId: product.id,
      priceId: price.id,
      name: product.name,
      description: product.description,
      price: price.unit_amount,
      currency: price.currency,
      features: body.features,
    };
  }

  @UseGuards(AuthMiddleware)
  @Post('create-subscription')
  async createSubscription(
    @Body() body: CreateSubscriptionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { email, _id: userId } = req.user;

    // Create or get customer
    const customer = await this.stripeService.createCustomer(email);

    // Create subscription
    const subscription = await this.stripeService.createSubscription(
      body.priceId,
      customer.id,
    );

    // Get the subscription plan
    const subscriptionPlan = await this.subscriptionService.findOneById(body.subscriptionId);

    // Update user's subscription
    await this.userSubscribesService.subscribeToPlan(
      subscriptionPlan,
      userId,
      subscription.id,
    );

    return {
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any).payment_intent
        .client_secret,
    };
  }

  @UseGuards(AuthMiddleware)
  @Post('cancel-subscription')
  async cancelSubscription(@Body() body: CancelSubscriptionDto) {
    return await this.stripeService.cancelSubscription(body.subscriptionId);
  }
}
