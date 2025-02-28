/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Signal } from './signal.schema';
import { Cron } from '@nestjs/schedule';
import { SignalGateway } from './signal.gateway';
@Injectable()
export class SignalService {
  constructor(
    @InjectModel(Signal.name) private signalModel: Model<Signal>,
    private signalGateway: SignalGateway,
  ) {}

  async create(signal: Signal): Promise<Signal> {
    try {
      const createdSignal = new this.signalModel(signal);
      const savedSignal = await createdSignal.save();
      this.signalGateway.sendSignal(savedSignal);
      return savedSignal;
    } catch (error) {
      console.error('Error creating signal:', error);
      throw error;
    }
  }

  async findAll(): Promise<Signal[]> {
    return this.signalModel.find().exec();
  }

  @Cron('*/30 * * * * *')
  async updateExpiredSignals(): Promise<void> {
    const now = new Date();
    try {
      const result = await this.signalModel.updateMany(
        { expireAt: { $lt: now }, expired: false },
        { expired: true },
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} expired signals.`);
      }
    } catch (error) {
      console.error('Error updating expired signals:', error);
    }
  }
}
