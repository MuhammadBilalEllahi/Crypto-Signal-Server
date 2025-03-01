/* eslint-disable prettier/prettier */
import { Controller, Post, Get, Body, Req, Param, Query } from '@nestjs/common';
import { SignalService } from './signal.service';
import { Signal } from './signal.schema';
import * as moment from 'moment';
@Controller('signals')
export class SignalController {
  constructor(private readonly signalService: SignalService) { }

  @Post('admin/create')
  async create(@Body() signal: Signal, @Req() req) {
    console.log(`Admin ${req.user.email} created a new signal`);
    return this.signalService.create(signal);
  }

  @Get()
  async findAll() {//@Req() req
    // console.log(`User ${req.user.uid} finds All signals`);

    const signals = await this.signalService.findAll()

    return signals.map(signal => ({
      ...signal,
      createdAt: moment(signal.createdAt).fromNow(), //  Format to "X days ago"
      expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'), //  Format to "3 March 2025 22:45"
    }));
  }

  @Get('/paginated')
  async findAllPaginated(
    @Query('pageId') pageId: string,
    @Query('pageSize') pageSize: string
  ) {
    const page = parseInt(pageId) || 1; // Default to page 1 if not provided
    const size = parseInt(pageSize) || 10; // Default to 5 signals per page

    return this.signalService.findAllPaginated(page, size);
  }

  @Get('history')
  async findHistory( @Req() req, 

  @Query('pageId') pageId: string,
  @Query('pageSize') pageSize: string
){
  
  const page = parseInt(pageId) || 1; // Default to page 1 if not provided
  const size = parseInt(pageSize) || 10; // Default to 5 signals per page

    return await this.signalService.findHistory(req.user.uid as string,page, size)
   }
  
  @Post('favorite/:signalId')
   async toggleFavouriteSignal(@Param('signalId') signalId: string,  @Req() req){
    console.log(`User ${req.user.uid} favorited a new signal id ${signalId}`);
    return await this.signalService.toggleFavouriteSignal(req.user.uid as string,signalId)
   }

   @Get('favorites')
   async favouriteSignals(  @Req() req){
    console.log(`User ${req.user.uid} asked for favorited signal list`);
    return await this.signalService.userFavouriteSignals(req.user.uid as string)
   }

 
}
