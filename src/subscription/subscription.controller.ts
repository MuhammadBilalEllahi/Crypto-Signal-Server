/* eslint-disable prettier/prettier */

import { Controller, Get, Post, Body, Param, Put, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Subscription } from './subscription.schema';
import { AdminMiddleware } from 'src/auth/admin.middleware';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}


   @Get('live')
   getLiveSubscriptions() {
    return this.subscriptionService.getLiveSubscriptions();
   }

  @UseGuards(AdminMiddleware)
  @Get()
  findAll() {
    return this.subscriptionService.findAll();
  }

  @UseGuards(AdminMiddleware)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findOneById(id);
  }

  @UseGuards(AdminMiddleware)
  @Post()
  create(@Body() subscription: Subscription) {
    return this.subscriptionService.create(subscription);
  }

  @UseGuards(AdminMiddleware)
  @Put(':id')
  update(@Param('id') id: string, @Body() subscription: Subscription) {
    return this.subscriptionService.update(id, subscription);
  }
}

