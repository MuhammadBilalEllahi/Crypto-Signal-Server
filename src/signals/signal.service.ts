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
import { UserSubscribe } from 'src/userSubscribes/userSubscribes.schema';

interface CachedUserStatus {
  status: string;
}

interface SignalData {
  _id: Types.ObjectId;
  createdAt: Date;
  expireAt: Date;
  [key: string]: any;
}

interface SignalResponse {
  _id: string;
  createdAt: string;
  createdFormatted: string;
  expireAt: string;
  isFavorite: boolean;
  [key: string]: any;
}

interface PaginatedResponse {
  signals: SignalResponse[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalSignals: number;
    totalPages: number;
  };
  isPremiumUser: boolean;
}

@Injectable()
export class SignalService {
  constructor(
    @InjectModel(Signal.name) private signalModel: Model<Signal>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private signalGateway: SignalGateway,
    private readonly redisService: RedisService,
    @InjectModel(UserSubscribe.name) private userSubscribeModel: Model<UserSubscribe>,
  ) {}

  async create(signal: Signal): Promise<Signal> {
    try {
      const createdSignal = new this.signalModel(signal);
      const savedSignal = await createdSignal.save();

      if(savedSignal.isLive){
        const signalData = (savedSignal.toObject ? savedSignal.toObject() : savedSignal) as SignalData;
          const response: SignalResponse = {
          ...signalData,
          _id: signalData._id.toString(),
          createdAt: moment(signalData.createdAt).fromNow(),
          createdFormatted: moment(signalData.createdAt).format('D MMMM YYYY HH:mm'),
          expireAt: moment(signalData.expireAt).format('D MMMM YYYY HH:mm'),
          isFavorite: false,
        };
        console.log("savedSignalWithCreatedFormated", response);
        this.signalGateway.sendSignal(response);
      }
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

  

  async findAllPaginated(_id: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse> {
    const redisKey = `signals_paginated_all`;
    const redisKey2 = `premium_signals_paginated_all`;
    const userSubscribeKey = `user_subscribe_status_${_id}`;

    let signals: Signal[] = [];
    let isPremiumUser = false;
    
    // First check Redis for user subscription status
    const cachedUserStatus = await this.redisService.get(userSubscribeKey);
    if (cachedUserStatus) {
      const parsedStatus = JSON.parse(cachedUserStatus as string) as CachedUserStatus;
      isPremiumUser = parsedStatus?.status === 'active';
    } else {
      // If not in Redis, check database
      const userSubscribe = await this.userSubscribeModel.findById({_id: _id});
      isPremiumUser = userSubscribe?.status === 'active';
      // Cache the user status for 1 hour
      await this.redisService.set(userSubscribeKey, JSON.stringify({ status: userSubscribe?.status }), 3600);
    }

    // Check Redis for signals based on user type
    if (isPremiumUser) {
      const cachedPremiumSignals = await this.redisService.get(redisKey2);
      if (cachedPremiumSignals) {
        signals = JSON.parse(cachedPremiumSignals as string) as Signal[];
      } else {
        // Fetch premium signals from database
        signals = await this.signalModel.find({
          expired: false,
          isLive: true,
          isDeleted: false,
        })
        .sort({ createdAt: -1 })
        .lean();
        
        // Cache premium signals for 5 minutes
        await this.redisService.set(redisKey2, JSON.stringify(signals), 300);
      }
    } else {
      const cachedFreeSignals = await this.redisService.get(redisKey);
      if (cachedFreeSignals && cachedFreeSignals !== '[]') {
        console.log("cachedFreeSignals", cachedFreeSignals);
        signals = JSON.parse(cachedFreeSignals as string) as Signal[];
      } else {
        console.log("Fetching free signals from database");
        // Fetch free signals from database
        signals = await this.signalModel
          .find({
            expired: false,
            isLive: true,
            isDeleted: false,
            subscriptionValue: 'spot-free'
          })
          .sort({ createdAt: -1 })
          .lean();
        
        // Cache free signals for 5 minutes
        await this.redisService.set(redisKey, JSON.stringify(signals), 300);
      }
    }

    // Apply pagination
    const totalSignals = signals.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedSignals = signals.slice(startIndex, endIndex);

    // Get user's favorite signals from Redis
    const favoriteSignalIds = await this.redisService.get(`user_favourite_signals_${_id}`) as string;

    return {
      signals: paginatedSignals.map(signal => {
        const signalData = (signal.toObject ? signal.toObject() : signal) as SignalData;
        const response: SignalResponse = {
          ...signalData,
          _id: signalData._id.toString(),
          createdAt: moment(signalData.createdAt).fromNow(),
          createdFormatted: moment(signalData.createdAt).format('D MMMM YYYY HH:mm'),
          expireAt: moment(signalData.expireAt).format('D MMMM YYYY HH:mm'),
          isFavorite: favoriteSignalIds && favoriteSignalIds?.length > 0 ? favoriteSignalIds.includes(signalData._id.toString()) : false,
        };
        return response;
      }),
      pagination: {
        currentPage: page,
        pageSize,
        totalSignals,
        totalPages: Math.ceil(totalSignals / pageSize),
      },
      isPremiumUser,
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


  @Cron('0 0 * * *') // every day at 00:00
  async checkUserFreePlan(): Promise<void> {
    try {
      const users = await this.userModel.find({ userSubscribe: { $exists: true } });

      for (const user of users) {
        const userSubscribe = await this.userSubscribeModel.findById(user._id);
        if (userSubscribe && userSubscribe.status === 'active' && userSubscribe.endDate < new Date()  ) {
          await this.userModel.updateOne({ _id: user._id }, { freePlan: true });
          userSubscribe.status = 'expired';
          await userSubscribe.save();
          await this.redisService.del(`user_subscribe_status_${user._id}`);
          console.log(`Updated user ${user._id} free plan to true as the subscription expired.`);
        }
      }
    } catch (error) {
      console.error('Error updating users free plan:', error);
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
  

  async findHistory( _id: string, page: number = 1, pageSize: number = 10,) {
    const skip = (page - 1) * pageSize;
    const redisKey = `signal_history`;
    // const resisKeyForPremiumHistory = `premium_signal_history`;
    const userSubscribeKey = `user_subscribe_status_${_id}`;
    let isPremiumUser = false;
    let historyData: Signal[] | null = null;


    const cachedUserStatus = await this.redisService.get(userSubscribeKey);
    if (cachedUserStatus) {
      const parsedStatus = JSON.parse(cachedUserStatus as string) as CachedUserStatus;
      isPremiumUser = parsedStatus?.status === 'active';
    } else {
      const userSubscribe = await this.userSubscribeModel.findById({_id: _id});
      isPremiumUser = userSubscribe?.status === 'active';
      await this.redisService.set(userSubscribeKey, JSON.stringify({ status: userSubscribe?.status }), 3600);
    }

    console.log("isPremiumUser===================", isPremiumUser);
      const cachedData = await this.redisService.get(redisKey);
    if (cachedData) {
      try {
        historyData = JSON.parse(cachedData as string) as Signal[];
      } catch (error) {
          console.error('Error parsing cached history data:', error);
        }
      }

    // Check if history data is in Redis
    
    

    if (!historyData) {
      // Fetch all history data from the database
      const allHistory = await this.signalModel.find({ expired: true, isLive: true, isDeleted: false }).lean();
      // Store the entire history data in Redis
      await this.redisService.set(redisKey, JSON.stringify(allHistory));
      historyData = allHistory;
    }

    // Fetch user's favorite signals
    // const user = await this.userModel.findOne({ _id, isDeleted: false }).select('favoriteSignals');
    const favoriteSignalIds = await this.redisService.get(`user_favourite_signals_${_id}`) as string;
    console.log("favoriteSignalIds", favoriteSignalIds);
    

    const filteredHistory = isPremiumUser 
      ? historyData 
      : historyData.filter(signal => signal.subscriptionValue === 'spot-free');

    // Apply pagination on the history data from Redis
    const paginatedHistory = filteredHistory.slice(skip, skip + pageSize);



    // Add `isFavorite` flag to each signal
    const historyWithFavorites = paginatedHistory.map((signal: any) =>  ({
       ...signal,
      createdAt: moment(signal.createdAt).fromNow(), // Format to "X days ago"
      expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'), // Format to "3 March 2025 22:45"
      createdFormatted: moment(signal.createdAt).format('D MMMM YYYY HH:mm'),
      isFavorite: favoriteSignalIds && favoriteSignalIds?.length > 0 ? favoriteSignalIds.includes(signal._id.toString()) : false, // Check if it's in favorites
    }));

    return {
      total: filteredHistory.length,
      page,
      pageSize,
      history: historyWithFavorites, // Return signals with `isFavorite`
      hasMore: skip + pageSize < filteredHistory.length,
    };
  }
  

async toggleFavouriteSignal(_id: string, signalId: string) {

    const user = await this.userModel.findOne({ _id });

  if (!user) {
    throw new Error("User not found");
  }

  const redisKey = `user_favourite_signals_${_id}`;
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
    { _id },
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

async userFavouriteSignals(_id: string, page: number = 1, pageSize: number = 10) {
  console.log("Checking user favourite signals in Redis", `user_favourite_signals_${_id}`);
  
  // Check if all favorite signals are cached in Redis
  if (!await this.redisService.exists(`user_favourite_signals_${_id}`)) {
    console.log("Fetching user favourite signals from database");
    
    // Fetch all favorite signals from the database
    const user = await this.userModel
      .findOne({ _id })
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
    await this.redisService.set(`user_favourite_signals_${_id}`, JSON.stringify(favoritesWithFlag));
  }

  // Retrieve all favorite signals from Redis
  const userFavouriteSignals = await this.redisService.get(`user_favourite_signals_${_id}`);
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
