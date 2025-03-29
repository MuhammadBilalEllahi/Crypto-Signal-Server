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

@Controller('user-subscribes')
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

    @Post('user/pay-plan/:priceId/:productId')
    subscribeToPlan(@Req() req: AuthenticatedRequest, @Param('priceId') priceId: string, @Param('productId') productId: string ) {
        const userId = req.user._id;
        const userEmail = req.user.email;
        console.log("USER ID: ", userId);
        console.log("PRICE ID: ", priceId);
        console.log("PRODUCT ID: ", productId);
        console.log("USER EMAIL: ", userEmail);
        return this.userSubscribesService.subscribeToPlan(userId, priceId, productId, userEmail);
    }

    refundSubscription(@Param('id') id: string) {
        return this.userSubscribesService.refundSubscription(id);
    }

    cancelSubscription(@Param('id') id: string) {
        return this.userSubscribesService.cancelSubscription(id);
    }
    
    
}


