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
exports.SignalController = void 0;
const common_1 = require("@nestjs/common");
const signal_service_1 = require("./signal.service");
const signal_schema_1 = require("./signal.schema");
const moment = require("moment");
let SignalController = class SignalController {
    signalService;
    constructor(signalService) {
        this.signalService = signalService;
    }
    async create(signal, req) {
        console.log(`Admin ${req.user.email} created a new signal`);
        return this.signalService.create(signal);
    }
    async findAll() {
        const signals = await this.signalService.findAll();
        return signals.map(signal => ({
            ...signal,
            createdAt: moment(signal.createdAt).fromNow(),
            expireAt: moment(signal.expireAt).format('D MMMM YYYY HH:mm'),
        }));
    }
    async findAllPaginated(pageId, pageSize) {
        const page = parseInt(pageId) || 1;
        const size = parseInt(pageSize) || 10;
        return this.signalService.findAllPaginated(page, size);
    }
    async findHistory(req, pageId, pageSize) {
        const page = parseInt(pageId) || 1;
        const size = parseInt(pageSize) || 10;
        return await this.signalService.findHistory(req.user.uid, page, size);
    }
    async toggleFavouriteSignal(signalId, req) {
        console.log(`User ${req.user.uid} favorited a new signal id ${signalId}`);
        return await this.signalService.toggleFavouriteSignal(req.user.uid, signalId);
    }
    async favouriteSignals(req) {
        console.log(`User ${req.user.uid} asked for favorited signal list`);
        return await this.signalService.userFavouriteSignals(req.user.uid);
    }
};
exports.SignalController = SignalController;
__decorate([
    (0, common_1.Post)('admin/create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signal_schema_1.Signal, Object]),
    __metadata("design:returntype", Promise)
], SignalController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SignalController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('/paginated'),
    __param(0, (0, common_1.Query)('pageId')),
    __param(1, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SignalController.prototype, "findAllPaginated", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('pageId')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SignalController.prototype, "findHistory", null);
__decorate([
    (0, common_1.Post)('favorite/:signalId'),
    __param(0, (0, common_1.Param)('signalId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SignalController.prototype, "toggleFavouriteSignal", null);
__decorate([
    (0, common_1.Get)('favorites'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SignalController.prototype, "favouriteSignals", null);
exports.SignalController = SignalController = __decorate([
    (0, common_1.Controller)('signals'),
    __metadata("design:paramtypes", [signal_service_1.SignalService])
], SignalController);
//# sourceMappingURL=signal.controller.js.map