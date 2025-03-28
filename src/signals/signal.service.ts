/* eslint-disable prettier/prettier */
import { Get, Injectable, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Signal } from './signal.schema';
import { Cron } from '@nestjs/schedule';
import { SignalGateway } from './signal.gateway';
import * as moment from 'moment';
import { User, UserDocument } from 'src/user/user.schema';
import { FilterQuery } from 'mongoose';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class SignalService {
  constructor(
    @InjectModel(Signal.name) private signalModel: Model<Signal>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private signalGateway: SignalGateway,
    private readonly redisService: RedisService,
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

  async toggleLiveStatus(id: string): Promise<Signal> {
    const existingSignal = await this.signalModel.findById(id);
    if (!existingSignal) {
      throw new Error('Signal not found');
    }
    if(existingSignal.isDeleted){
      throw new Error('Signal cant be live because it is deleted');
    }
      
    const signal = await this.signalModel.findByIdAndUpdate(
      id,
      { isLive: !existingSignal.isLive },
      { new: true }
    );
    return signal as Signal;
  }


  async deleteSignal(signalId: string): Promise<Signal> {
    const signal = await this.signalModel.findByIdAndUpdate(signalId, { isDeleted: true, isLive: false }, { new: true });
    if (signal) {
      await this.redisService.removeFromFavourites(signalId);
      await this.redisService.removeFromHistory(signalId);
    }
    return signal as Signal;
  }

  async deletedSignals(): Promise<Signal[]> {
    const signals = await this.signalModel.find({ isDeleted: true, isLive: false }).exec();
    return signals as Signal[];
  }

  async undeleteSignal(signalId: string): Promise<Signal> {
    const signal = await this.signalModel.findByIdAndUpdate(signalId, { isDeleted: false, isLive: false }, { new: true });
    return signal as Signal;
  }
  
  async allSignals(data: any): Promise<Signal[]> {
    const signals = await this.signalModel.find(data as FilterQuery<Signal>).exec();
    if (!signals) {
      throw new Error('Signals not found');
    }
    return signals as Signal[];
  }

  async updateSignal(signalId: string, data: any): Promise<Signal> {
    const signal = await this.signalModel.findByIdAndUpdate(signalId, data, { new: true });
    if (signal) {
      await this.redisService.updateSignalData(signalId, data);
    }
    return signal as Signal;
  } 

  async deleteSignalCompletely(signalId: string): Promise<Signal> {
    const signal = await this.signalModel.findByIdAndDelete(signalId);
    if (signal) {
      await this.redisService.removeFromFavourites(signalId);
      await this.redisService.removeFromHistory(signalId);
    }
    return signal as Signal;
  }

  async getSingleSignal(signalId: string): Promise<Signal> {
    const signal = await this.signalModel.findById(signalId);
    return signal as Signal;
  }

  async isNotLiveSignals(): Promise<Signal[]> {
    const signals = await this.signalModel.find({ isLive: false, isDeleted: false }).exec();
    return signals as Signal[];
  }








  // async findAll(): Promise<Signal[]> {
  //   return this.signalModel.find().exec();
  // }

  async findAll() {
    const signals = await this.signalModel.find({isLive:true, isDeleted:false}).limit(5).sort({ createdAt: -1 }).lean(); // Sort latest first

    return signals.map(signal => ({
      ...signal,
      createdAt: moment(signal.createdAt).fromNow(), //  Format to "X days ago"
      expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'), //  Format to "3 March 2025 22:45"
      createdFormatted: moment(signal.createdAt).format('D MMMM YYYY HH:mm'),
    }));
  }


  async findAllPaginated(page: number = 1, pageSize: number = 10, uid: string) {
    const redisKey = `signals_paginated_all`;
    let signals: Signal[] = [];
    
    // Check if the data is already cached in Redis
    if (await this.redisService.exists(redisKey)) {
      const cachedData = await this.redisService.get(redisKey);
      if (cachedData) {
        signals = JSON.parse(cachedData as string) as Signal[];
      }
    } else {
      // Fetch from the database if not cached
      signals = await this.signalModel
        .find({ expired: false, isLive: true, isDeleted: false })
        .sort({ createdAt: -1 }) // Sort latest first
        .lean();
      
      // Store the entire dataset in Redis
      await this.redisService.set(redisKey, JSON.stringify(signals));
    }

    const totalSignals = signals.length; // Get total count from the cached data
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedSignals = signals.slice(startIndex, endIndex);

    const favoriteSignalIds = await this.redisService.get(`user_favourite_signals_${uid}`) as string;
    console.log("favoriteSignalIds", favoriteSignalIds);

    return {
      signals: paginatedSignals.map(signal => ({
        ...signal,
        createdAt: moment(signal.createdAt).fromNow(), // Format to "X days ago"
        createdFormatted: moment(signal.createdAt).format('D MMMM YYYY HH:mm'), // Format to "3 March 2025 22:45"
        expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'), // Format to "3 March 2025 22:45"
        isFavorite: favoriteSignalIds && favoriteSignalIds?.length > 0 ? favoriteSignalIds.includes(signal._id as string) : false, // Check if it's in favorites
      })),
      pagination: {
        currentPage: page,
        pageSize,
        totalSignals,
        totalPages: Math.ceil(totalSignals / pageSize),
      },
    };
  }
  

  @Cron('*/30 * * * * *')
  async updateExpiredSignals(): Promise<void> {
    const now = new Date();
    try {
      const result = await this.signalModel.updateMany(
        { expireAt: { $lt: now }, expired: false, isDeleted: false },
        { expired: true },
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} expired signals.`);

        // Fetch all expired signals
        const expiredSignals = await this.signalModel.find({ expired: true, isLive: true, isDeleted: false }).lean();

        // Update the entire history data in Redis
        const redisKey = `signal_history`;
        await this.redisService.set(redisKey, JSON.stringify(expiredSignals));
      }
    } catch (error) {
      console.error('Error updating expired signals:', error);
    }
  }


  // async findHistory(page: number = 1, pageSize: number = 10) {
  //   const skip = (page - 1) * pageSize;
    
  //   const [history, total] = await Promise.all([
  //     this.signalModel.find({ expired: true }).skip(skip).limit(pageSize),
  //     this.signalModel.countDocuments({ expired: true }),
  //   ]);
  
  //   return {
  //     total,
  //     page,
  //     pageSize,
  //     history,
  //     hasMore: skip + pageSize < total, // Check if more pages exist
  //   };
  // }
  

  async findHistory(uid: string, page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;
    const redisKey = `signal_history`;

    // Check if history data is in Redis
    let historyData: Signal[] | null = null;
    const cachedData = await this.redisService.get(redisKey);
    if (cachedData) {
      try {
        historyData = JSON.parse(cachedData as string) as Signal[];
      } catch (error) {
        console.error('Error parsing cached history data:', error);
      }
    }

    if (!historyData) {
      // Fetch all history data from the database
      const allHistory = await this.signalModel.find({ expired: true, isLive: true, isDeleted: false }).lean();
      
      // Store the entire history data in Redis
      await this.redisService.set(redisKey, JSON.stringify(allHistory));
      historyData = allHistory;
    }

    // Fetch user's favorite signals
    // const user = await this.userModel.findOne({ uid, isDeleted: false }).select('favoriteSignals');
    const favoriteSignalIds = await this.redisService.get(`user_favourite_signals_${uid}`) as string;
    console.log("favoriteSignalIds", favoriteSignalIds);
    

    // Apply pagination on the history data from Redis
    const paginatedHistory = historyData.slice(skip, skip + pageSize);

    // Add `isFavorite` flag to each signal
    const historyWithFavorites = paginatedHistory.map((signal: any) => ({
      ...signal,
      createdAt: moment(signal.createdAt).fromNow(), // Format to "X days ago"
      expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'), // Format to "3 March 2025 22:45"
      createdFormatted: moment(signal.createdAt).format('D MMMM YYYY HH:mm'),
      isFavorite: favoriteSignalIds && favoriteSignalIds?.length > 0 ? favoriteSignalIds.includes(signal._id.toString()) : false, // Check if it's in favorites
    }));

    return {
      total: historyData.length,
      page,
      pageSize,
      history: historyWithFavorites, // Return signals with `isFavorite`
      hasMore: skip + pageSize < historyData.length,
    };
  }
  

async toggleFavouriteSignal(uid: string, signalId: string) {

  const user = await this.userModel.findOne({ uid });

  if (!user) {
    throw new Error("User not found");
  }

  const redisKey = `user_favourite_signals_${uid}`;
  const redisValue = await this.redisService.get(redisKey);
  console.log("redisValue", redisValue);

  if (!user.favoriteSignals) {
    user.favoriteSignals = []; // Ensure it's initialized
  }

  const signalObjectId = new Types.ObjectId(signalId); // Convert string ID to ObjectId

  // Debugging logs
  console.log("User favorite signals:", user.favoriteSignals);
  console.log("Checking against signal ID:", signalObjectId);

  // Ensure favoriteSignals contains objects with _id (not raw strings)
  const isFavourite = user.favoriteSignals.some((favSignal: any) => {
    if (!favSignal || !favSignal._id) return false; // Prevent undefined errors
    return new Types.ObjectId(favSignal._id).equals(signalObjectId);
  });

  const updateResult = await this.userModel.findOneAndUpdate(
    { uid },
    isFavourite
      ? { $pull: { favoriteSignals: signalObjectId } } // Remove if exists
      : { $push: { favoriteSignals: signalObjectId } }, // Add if not exists
    { new: true }
  );

  // Update Redis cache
  if (redisValue) {
    const favorites = JSON.parse(redisValue as string);
    if (isFavourite) {
      // Remove the signal from Redis cache
      const updatedFavorites = favorites.filter((fav: any) => fav._id.toString() !== signalId);
      await this.redisService.set(redisKey, JSON.stringify(updatedFavorites));
    } else {
      // Add the signal to Redis cache
      const newSignal = await this.signalModel.findById(signalObjectId).lean();
      if (newSignal) {
        const newSignalWithCreatedFormated = {
          ...newSignal,
          createdAt: moment(newSignal.createdAt).fromNow(),
          createdFormatted: moment(newSignal.createdAt).format('D MMMM YYYY HH:mm'),
          expireAt: moment(newSignal.expireAt).format('D MMMM YYYY HH:mm'),
        }

        favorites.push({ ...newSignalWithCreatedFormated, isFavorite: true });
        await this.redisService.set(redisKey, JSON.stringify(favorites));
      }
    }
  }

  return updateResult;
}

async userFavouriteSignals(uid: string, page: number = 1, pageSize: number = 10) {
  console.log("Checking user favourite signals in Redis", `user_favourite_signals_${uid}`);
  
  // Check if all favorite signals are cached in Redis
  if (!await this.redisService.exists(`user_favourite_signals_${uid}`)) {
    console.log("Fetching user favourite signals from database");
    
    // Fetch all favorite signals from the database
    const user = await this.userModel
      .findOne({ uid })
      .populate({
        path: 'favoriteSignals',
        model: 'Signal',
        select: '-__v',
      });

    if (!user || !user.favoriteSignals) {
      return { total: 0, page, pageSize, favorites: [], hasMore: false };
    }

    const favoritesWithFlag = user.favoriteSignals.map((signal: any) => ({
      ...signal.toObject(),
      isFavorite: true,
      createdAt: moment(signal.createdAt).fromNow(),
      expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'),
      createdFormatted: moment(signal.createdAt).format('D MMMM YYYY HH:mm'),
    }));

    // Store all favorite signals in Redis
    await this.redisService.set(`user_favourite_signals_${uid}`, JSON.stringify(favoritesWithFlag));
  }

  // Retrieve all favorite signals from Redis
  const userFavouriteSignals = await this.redisService.get(`user_favourite_signals_${uid}`);
  const allFavorites = JSON.parse(userFavouriteSignals as string) as Signal[];

  const total = allFavorites.length;
  const skip = (page - 1) * pageSize;
  const paginatedFavorites = allFavorites.slice(skip, skip + pageSize);

  return {
    total,
    page,
    pageSize,
    favorites: paginatedFavorites,
    hasMore: skip + pageSize < total,
  };
}

async getFilters(type: string) {
  const filters = await this.signalModel.distinct(type);
  return filters;
}




 
}
