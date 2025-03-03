"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const signal_schema_1 = require("./signal.schema");
const schedule_1 = require("@nestjs/schedule");
const signal_gateway_1 = require("./signal.gateway");
const moment = require("moment");
const user_schema_1 = require("../user/user.schema");
let SignalService = class SignalService {
    signalModel;
    userModel;
    signalGateway;
    constructor(signalModel, userModel, signalGateway) {
        this.signalModel = signalModel;
        this.userModel = userModel;
        this.signalGateway = signalGateway;
    }
    async create(signal) {
        try {
            const createdSignal = new this.signalModel(signal);
            const savedSignal = await createdSignal.save();
            this.signalGateway.sendSignal(savedSignal);
            return savedSignal;
        }
        catch (error) {
            console.error('Error creating signal:', error);
            throw error;
        }
    }
    async findAll() {
        const signals = await this.signalModel.find().limit(5).sort({ createdAt: -1 }).lean();
        return signals.map(signal => ({
            ...signal,
            createdAt: moment(signal.createdAt).fromNow(),
            expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'),
        }));
    }
    async findAllPaginated(page = 1, pageSize = 10) {
        const skip = (page - 1) * pageSize;
        const signals = await this.signalModel
            .find({ expired: false })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean();
        const totalSignals = await this.signalModel.countDocuments();
        return {
            signals: signals.map(signal => ({
                ...signal,
                createdAt: moment(signal.createdAt).fromNow(),
                expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'),
            })),
            pagination: {
                currentPage: page,
                pageSize,
                totalSignals,
                totalPages: Math.ceil(totalSignals / pageSize),
            },
        };
    }
    async updateExpiredSignals() {
        const now = new Date();
        try {
            const result = await this.signalModel.updateMany({ expireAt: { $lt: now }, expired: false }, { expired: true });
            if (result.modifiedCount > 0) {
                console.log(`Updated ${result.modifiedCount} expired signals.`);
            }
        }
        catch (error) {
            console.error('Error updating expired signals:', error);
        }
    }
    async findHistory(uid, page = 1, pageSize = 10) {
        const skip = (page - 1) * pageSize;
        const user = await this.userModel.findOne({ uid }).select('favoriteSignals');
        const favoriteSignalIds = user?.favoriteSignals?.map((signal) => signal.toString()) || [];
        const [history, total] = await Promise.all([
            this.signalModel.find({ expired: true }).skip(skip).limit(pageSize).lean(),
            this.signalModel.countDocuments({ expired: true }),
        ]);
        const historyWithFavorites = history.map((signal) => ({
            ...signal,
            createdAt: moment(signal.createdAt).fromNow(),
            expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'),
            isFavorite: favoriteSignalIds.includes(signal._id.toString()),
        }));
        return {
            total,
            page,
            pageSize,
            history: historyWithFavorites,
            hasMore: skip + pageSize < total,
        };
    }
    async toggleFavouriteSignal(uid, signalId) {
        const user = await this.userModel.findOne({ uid });
        if (!user) {
            throw new Error("User not found");
        }
        if (!user.favoriteSignals) {
            user.favoriteSignals = [];
        }
        const signalObjectId = new mongoose_2.Types.ObjectId(signalId);
        console.log("User favorite signals:", user.favoriteSignals);
        console.log("Checking against signal ID:", signalObjectId);
        const isFavourite = user.favoriteSignals.some((favSignal) => {
            if (!favSignal || !favSignal._id)
                return false;
            return new mongoose_2.Types.ObjectId(favSignal._id).equals(signalObjectId);
        });
        return await this.userModel.findOneAndUpdate({ uid }, isFavourite
            ? { $pull: { favoriteSignals: signalObjectId } }
            : { $push: { favoriteSignals: signalObjectId } }, { new: true });
    }
    async userFavouriteSignals(uid, page = 1, pageSize = 10) {
        const skip = (page - 1) * pageSize;
        const user = await this.userModel
            .findOne({ uid })
            .populate({
            path: 'favoriteSignals',
            model: 'Signal',
            select: '-__v',
            options: { skip, limit: pageSize },
        });
        if (!user || !user.favoriteSignals) {
            return { total: 0, page, pageSize, favorites: [], hasMore: false };
        }
        const total = await this.signalModel.countDocuments({ _id: { $in: user.favoriteSignals } });
        const favoritesWithFlag = user.favoriteSignals.map((signal) => ({
            ...signal.toObject(),
            isFavorite: true,
            createdAt: moment(signal.createdAt).fromNow(),
            expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'),
        }));
        return {
            total,
            page,
            pageSize,
            favorites: favoritesWithFlag,
            hasMore: skip + pageSize < total,
        };
    }
};
exports.SignalService = SignalService;
__decorate([
    (0, schedule_1.Cron)('*/30 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SignalService.prototype, "updateExpiredSignals", null);
exports.SignalService = SignalService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(signal_schema_1.Signal.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        signal_gateway_1.SignalGateway])
], SignalService);
//# sourceMappingURL=signal.service.js.map