/* eslint-disable prettier/prettier */
import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { SignalService } from './signal.service';
import { Signal } from './signal.schema';
@Controller('signals')
export class SignalController {
  constructor(private readonly signalService: SignalService) {}

  @Post()
  async create(@Body() signal: Signal ,@Req() req) {
    console.log(`Admin ${req.user.email} created a new signal`);
    return this.signalService.create(signal);
  }

  @Get()
  async findAll() {
    return this.signalService.findAll();
  }
}
