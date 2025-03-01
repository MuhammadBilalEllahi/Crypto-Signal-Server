/* eslint-disable prettier/prettier */

/* eslint-disable prettier/prettier */
import { Get, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import * as admin from 'firebase-admin';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // Find user by Firebase ID
  async findByFirebaseId(uid: string): Promise<User | null> {
    return this.userModel.findOne({ uid }).exec();
  }

  // Find user OR create if not found
  async findOrCreate(userData: { uid: string; email: string; role: string }): Promise<User> {
    console.log("DATA",userData )
    let user = await this.userModel.findOne({ uid: userData.uid }).exec();
    
    if (!user) {
      user = new this.userModel(userData);
      // await  this.setUserRole(user.uid)
      await user.save();
    }
    
    return user;
  }

  // Get user by ID
  async getUserById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  // Create new user manually (for admin dashboard, if needed)
  async createUser(userData: { uid: string; email: string; role?: string }): Promise<User> {
    const newUser = new this.userModel({
      uid: userData.uid,
      email: userData.email,
      role: userData.role || 'user', // Default role is 'user'
    });
    
    return newUser.save();
  }

  // Update user details
  async updateUser(uid: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel.findOneAndUpdate({ uid }, updateData, { new: true }).exec();
  }

  // Delete user (if needed)
  async deleteUser(uid: string): Promise<User | null> {
    return this.userModel.findOneAndDelete({ uid }).exec();
  }

//   // NOT used..redundant
//   @Get()
//  async userFavourites(uid:string){
//   return await this.userModel.find({uid}).select('favoriteSignals').populate('favoriteSignals')
//  }


 async setUserRole(uid: string) {
  try {
    await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
    return { message: 'Role set to user' };
  } catch (error) {
    throw new Error(`Error setting user role: ${error.message}`);
  }
}
}



// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { User, UserDocument } from './user.schema';

// @Injectable()
// export class UserService {
//   constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

//   async findOrCreate(uid: string, email: string, role:string): Promise<User> {
//     let user = await this.userModel.findOne({ uid }).exec();
//     if (!user) {
//       user = await this.userModel.create({ uid, email, role: role });
//     }
//     return user;
//   }

//   async getUser(uid: string): Promise<User | null> {
//     return this.userModel.findOne({ uid }).exec();
//   }
// }
