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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("./user.schema");
const admin = require("firebase-admin");
let UserService = class UserService {
    userModel;
    constructor(userModel) {
        this.userModel = userModel;
    }
    async findByFirebaseId(uid) {
        return this.userModel.findOne({ uid }).exec();
    }
    async findOrCreate(userData) {
        console.log("DATA", userData);
        let user = await this.userModel.findOne({ uid: userData.uid }).exec();
        if (!user) {
            user = new this.userModel(userData);
            await user.save();
        }
        return user;
    }
    async getUserById(id) {
        return this.userModel.findById(id).exec();
    }
    async createUser(userData) {
        const newUser = new this.userModel({
            uid: userData.uid,
            email: userData.email,
            role: userData.role || 'user',
        });
        return newUser.save();
    }
    async updateUser(uid, updateData) {
        return this.userModel.findOneAndUpdate({ uid }, updateData, { new: true }).exec();
    }
    async deleteUser(uid) {
        return this.userModel.findOneAndDelete({ uid }).exec();
    }
    async setUserRole(uid) {
        try {
            await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
            return { message: 'Role set to user' };
        }
        catch (error) {
            throw new Error(`Error setting user role: ${error.message}`);
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UserService);
//# sourceMappingURL=user.service.js.map