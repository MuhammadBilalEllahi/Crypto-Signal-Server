/* eslint-disable prettier/prettier */
import { Get, UseGuards, Param, Req, Post, Controller, Body } from "@nestjs/common";
import { AuthMiddleware } from "src/auth/auth.middleware";
import { AdminMiddleware } from "src/auth/admin.middleware";
import { UserSubscribesService } from "./userSubscibes.service";
import { Subscription } from "../subscription/subscription.schema";

interface AuthenticatedRequest extends Request{
    user: {
        _id: string,
        uid: string,
        email: string
    }
}

@Controller()
export class UserSubscribesController {
    constructor(private readonly userSubscribesService: UserSubscribesService) {}

    @UseGuards(AdminMiddleware)
    @Get()
    findAll() {
        return this.userSubscribesService.findAll();
    }

    @UseGuards(AdminMiddleware)
    @Get('users-that-have-subscribed')
    usersThatHaveSubscribed() {
        return this.userSubscribesService.usersThatHaveSubscribed();
    }


    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userSubscribesService.findOne(id);
    }

    @Get('/my-subscribe')
    @UseGuards(AuthMiddleware)
    findMySubscribes(@Req() req: AuthenticatedRequest) {
        const userId = req.user._id;
        return this.userSubscribesService.findMySubscribe(userId);
    }

    @Post()
    subscribeToPlan(@Body() subscriptionId: Subscription, @Req() req: AuthenticatedRequest, @Body() stripeSubscriptionId: string) {
        const userId = req.user._id;
        return this.userSubscribesService.subscribeToPlan(subscriptionId, userId, stripeSubscriptionId);
    }

    refundSubscription(@Param('id') id: string) {
        return this.userSubscribesService.refundSubscription(id);
    }

    cancelSubscription(@Param('id') id: string) {
        return this.userSubscribesService.cancelSubscription(id);
    }
    
    
}


