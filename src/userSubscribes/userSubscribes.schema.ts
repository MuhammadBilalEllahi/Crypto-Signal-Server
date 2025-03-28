/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';


@Schema()
export class UserSubscribe extends Document {

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    declare  _id: mongoose.Schema.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    user: mongoose.Schema.Types.ObjectId; 

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' })
    subscription: mongoose.Schema.Types.ObjectId;

    @Prop({ required: true, enum: ['pending', 'active', 'cancelled'] })
    status: string;

    @Prop({ required: true })
    startDate: Date;

    @Prop({ required: true })
    endDate: Date;

    @Prop({ required: true })
    createdAt: Date;

    @Prop({ required: true })
    updatedAt: Date;

    @Prop()
    stripeSubscriptionId?: string;
}

export const UserSubscribeSchema = SchemaFactory.createForClass(UserSubscribe);
