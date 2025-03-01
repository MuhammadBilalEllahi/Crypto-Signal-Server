/* eslint-disable prettier/prettier */
import { Get, Injectable, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Signal } from './signal.schema';
import { Cron } from '@nestjs/schedule';
import { SignalGateway } from './signal.gateway';
import * as moment from 'moment';
import { User, UserDocument } from 'src/user/user.schema';

@Injectable()
export class SignalService {
  constructor(
    @InjectModel(Signal.name) private signalModel: Model<Signal>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

  // async findAll(): Promise<Signal[]> {
  //   return this.signalModel.find().exec();
  // }

  async findAll() {
    const signals = await this.signalModel.find().limit(5).sort({ createdAt: -1 }).lean(); // Sort latest first

    return signals.map(signal => ({
      ...signal,
      createdAt: moment(signal.createdAt).fromNow(), //  Format to "X days ago"
      expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'), //  Format to "3 March 2025 22:45"
    }));
  }


  async findAllPaginated(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize; // Calculate offset
  
    const signals = await this.signalModel
      .find({expired:false})
      .sort({ createdAt: -1 }) // Sort latest first
      .skip(skip)
      .limit(pageSize)
      .lean();
  
    const totalSignals = await this.signalModel.countDocuments(); // Get total count for pagination info
  
    return {
      signals: signals.map(signal => ({
        ...signal,
        createdAt: moment(signal.createdAt).fromNow(), // Format to "X days ago"
        expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'), // Format to "3 March 2025 22:45"
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
  
    // Fetch user's favorite signals
    const user = await this.userModel.findOne({ uid }).select('favoriteSignals');
    const favoriteSignalIds = user?.favoriteSignals?.map((signal: any) => signal.toString()) || [];
  
    const [history, total] = await Promise.all([
      this.signalModel.find({ expired: true }).skip(skip).limit(pageSize).lean(),
      this.signalModel.countDocuments({ expired: true }),
    ]);
  
    // Add `isFavorite` flag to each signal
    const historyWithFavorites = history.map((signal: any) => ({
      ...signal,
      createdAt: moment(signal.createdAt).fromNow(), //  Format to "X days ago"
      expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'), //  Format to "3 March 2025 22:45"
    
      isFavorite: favoriteSignalIds.includes(signal._id.toString()), // Check if it's in favorites
    }));

  
  
    return {
      total,
      page,
      pageSize,
      history: historyWithFavorites, // Return signals with `isFavorite`
      hasMore: skip + pageSize < total,
    };
  }
  

 async toggleFavouriteSignal(uid: string, signalId: string) {
  const user = await this.userModel.findOne({ uid });

  if (!user) {
    throw new Error("User not found");
  }

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

  return await this.userModel.findOneAndUpdate(
    { uid },
    isFavourite
      ? { $pull: { favoriteSignals: signalObjectId } } // Remove if exists
      : { $push: { favoriteSignals: signalObjectId } }, // Add if not exists
    { new: true }
  );
}

async userFavouriteSignals(uid: string, page: number = 1, pageSize: number = 10) {
  const skip = (page - 1) * pageSize;

  const user = await this.userModel
    .findOne({ uid })
    .populate({
      path: 'favoriteSignals',
      model: 'Signal',  // Ensure it references the correct model
      select: '-__v',  // Exclude unnecessary fields if needed
      options: { skip, limit: pageSize },
    });

  if (!user || !user.favoriteSignals) {
    return { total: 0, page, pageSize, favorites: [], hasMore: false };
  }

  const total = await this.signalModel.countDocuments({ _id: { $in: user.favoriteSignals } });

  const favoritesWithFlag = user.favoriteSignals.map((signal: any) => ({
    ...signal.toObject(), // Ensure it's a plain object
    isFavorite: true,
    createdAt: moment(signal.createdAt).fromNow(), //  Format to "X days ago"
    expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'), //  Format to "3 March 2025 22:45"
  
  }));

  return {
    total,
    page,
    pageSize,
    favorites:favoritesWithFlag ,  // Now populated with actual data
    hasMore: skip + pageSize < total,
  };
}




 
}
