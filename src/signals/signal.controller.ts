/* eslint-disable prettier/prettier */
import { Controller, Post, Get, Body, Req, Param, Query } from '@nestjs/common';
import { SignalService } from './signal.service';
import { Signal } from './signal.schema';
import * as moment from 'moment';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    email: string;
  }
}

@Controller('signals')
export class SignalController {
  constructor(private readonly signalService: SignalService) { }

  @Post('admin/create')
  async create(@Body() signal: Signal, @Req() req: AuthenticatedRequest) {
    console.log(`Admin ${req.user.email} created a new signal`);
    return this.signalService.create(signal);
  }

  @Get()
  async findAll() {
    const signals = await this.signalService.findAll()

    return signals.map(signal => ({
      ...signal,
      createdAt: moment(signal.createdAt).fromNow(),
      expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'),
    }));
  }

  @Get('/paginated')
  async findAllPaginated(
    @Query('pageId') pageId: string,
    @Query('pageSize') pageSize: string
  ) {
    const page = parseInt(pageId) || 1;
    const size = parseInt(pageSize) || 10;

    return this.signalService.findAllPaginated(page, size);
  }

  @Get('history')
  async findHistory(
    @Req() req: AuthenticatedRequest,
    @Query('pageId') pageId: string,
    @Query('pageSize') pageSize: string
  ) {
    const page = parseInt(pageId) || 1;
    const size = parseInt(pageSize) || 10;

    return await this.signalService.findHistory(req.user.uid, page, size)
  }
  
  @Post('favorite/:signalId')
  async toggleFavouriteSignal(
    @Param('signalId') signalId: string,
    @Req() req: AuthenticatedRequest
  ) {
    console.log(`User ${req.user.uid} favorited a new signal id ${signalId}`);
    return await this.signalService.toggleFavouriteSignal(req.user.uid, signalId)
  }

  @Get('favorites')
  async favouriteSignals(@Req() req: AuthenticatedRequest) {
    console.log(`User ${req.user.uid} asked for favorited signal list`);
    return await this.signalService.userFavouriteSignals(req.user.uid)
  }
}
