/* eslint-disable prettier/prettier */
import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { StripeService, StripeSubscription } from './stripe.service';
import { AuthMiddleware } from '../auth/auth.middleware';
import { UserSubscribesService } from '../userSubscribes/userSubscibes.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { AdminMiddleware } from '../auth/admin.middleware';
import { SubscriptionDuration } from '../subscription/subscription.schema';
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
  marketingFeatures: string[];
  durationType: SubscriptionDuration;
}

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly userSubscribesService: UserSubscribesService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @UseGuards(AdminMiddleware)
  @Get('products')
  async getProducts() {
    return await this.stripeService.listProducts();
  }

  @UseGuards(AdminMiddleware)
  @Get('prices')
  async getPrices() {
    return await this.stripeService.listPrices();
  }

  @UseGuards(AdminMiddleware)
  @Get('subscriptions')
  async getStripeSubscriptions(): Promise<StripeSubscription[]> {
    return await this.stripeService.listSubscriptions();
  }

  @UseGuards(AdminMiddleware)
  @Get('plans')
  async getPlans() {
    const products = await this.stripeService.listProducts();
    const prices = await this.stripeService.listPrices();
    

    console.log("______products", products);
    console.log("______prices", prices);

    return products.map(product => {
      const productPrices = prices.filter(price => price.product === product.id);
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        features: product.metadata?.features?.split(',') || [],
        prices: productPrices.map(price => ({
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval,
        })),
      };
    });
  }

  @UseGuards(AdminMiddleware)
  @Post('create-plan')
  async createPlan(@Body() body: CreatePlanDto) {
    // Create product in Stripe
    const product = await this.stripeService.createProduct(
      body.name,
      body.price,
      body.currency,
      body.description,
      body.durationType,
      // body.duration,
      body.marketingFeatures,
    );

    // Add features as metadata
    await this.stripeService.updateProduct(product.id, {
      metadata: {
        marketingFeatures: body.marketingFeatures.join(','),
      },
    });

    // Create price for the product
    const price = await this.stripeService.createPrice(
      body.price,
      body.currency,
      product.id,
      body.durationType,
    );

    return {
      productId: product.id,
      priceId: price.id,
      name: product.name,
      description: product.description,
      price: price.unit_amount,
      currency: price.currency,
      marketingFeatures: body.marketingFeatures,
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
