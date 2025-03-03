import { Document } from 'mongoose';
export declare class Signal extends Document {
    coin: string;
    createdBy: string;
    direction: 'Long' | 'Short';
    portfolioPercentage: number;
    entryPrice: number;
    exitPrice: number;
    gainLossPercentage: number;
    createdAt: Date;
    expireAt: Date;
    expired: boolean;
}
export declare const SignalSchema: import("mongoose").Schema<Signal, import("mongoose").Model<Signal, any, any, any, Document<unknown, any, Signal> & Signal & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Signal, Document<unknown, {}, import("mongoose").FlatRecord<Signal>> & import("mongoose").FlatRecord<Signal> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
