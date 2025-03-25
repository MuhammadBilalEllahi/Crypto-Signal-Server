/* eslint-disable prettier/prettier */
import { Controller, Post, Get, Body, Req, Param, Query, UseGuards,  Delete, Put } from '@nestjs/common';
import { SignalService } from './signal.service';
import { Signal } from './signal.schema';
import * as moment from 'moment';
import { Request } from 'express';
import { AdminMiddleware } from 'src/auth/admin.middleware';

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

  

  @UseGuards(AdminMiddleware)
  @Get('admin/:id/toggle-live')
  async toggleLiveStatus(@Param('id') id: string): Promise<Signal> {
    return this.signalService.toggleLiveStatus(id);
  }


  @UseGuards(AdminMiddleware)
  @Delete('admin/:signalId')
  async deleteSignal(@Param('signalId') signalId: string): Promise<Signal> {
    return this.signalService.deleteSignal(signalId);
  }



  @UseGuards(AdminMiddleware)
  @Get('admin/all')
    async allSignals(@Body() data: any): Promise<Signal[]> {
      return this.signalService.allSignals(data);
    }

    @UseGuards(AdminMiddleware)
    @Get('admin/deleted')
    async deletedSignals(): Promise<Signal[]> {
      return this.signalService.deletedSignals();
    }

    @UseGuards(AdminMiddleware)
    @Get('admin/isNotLive')
    async isNotLiveSignals(): Promise<Signal[]> {
      return this.signalService.isNotLiveSignals();
    }

    @UseGuards(AdminMiddleware)
    @Get('admin/undelete/:signalId')
    async undeleteSignal(@Param('signalId') signalId: string): Promise<Signal> {
      return this.signalService.undeleteSignal(signalId);
    }

    @UseGuards(AdminMiddleware)
    @Put('admin/update/:signalId')
    async updateSignal(@Param('signalId') signalId: string, @Body() data: any): Promise<Signal> {
      return this.signalService.updateSignal(signalId, data);
    }

    @UseGuards(AdminMiddleware)
    @Get('admin/single/:signalId')
    async getSingleSignal(@Param('signalId') signalId: string): Promise<Signal> {
      return this.signalService.getSingleSignal(signalId);
    }

    @UseGuards(AdminMiddleware)
    @Delete('admin/delete/hard/:signalId')
    async deleteSignalCompletely(@Param('signalId') signalId: string): Promise<Signal> {
      return this.signalService.deleteSignalCompletely(signalId);
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
    @Query('pageSize') pageSize: string,
    @Req() req: AuthenticatedRequest
  ) {
    const page = parseInt(pageId) || 1;
    const size = parseInt(pageSize) || 10;

    return this.signalService.findAllPaginated(page, size, req.user.uid);
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

  @Get('filters/:type')
  async getFilters(@Param('type') type: string) {
    return await this.signalService.getFilters(type)
  }
}
