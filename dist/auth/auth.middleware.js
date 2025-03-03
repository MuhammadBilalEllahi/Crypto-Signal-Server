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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("../user/user.service");
const jwt = require("jsonwebtoken");
let AuthMiddleware = class AuthMiddleware {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async use(req, res, next) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token)
            throw new common_1.UnauthorizedException('Token required');
        try {
            const decodedToken = jwt.decode(token, { complete: true });
            console.log("decoded", decodedToken);
            if (!decodedToken || !decodedToken.payload.sub) {
                console.log('Invalid Decoded Token:', decodedToken);
                return res.status(401).json({ message: 'Invalid token' });
            }
            let user = decodedToken.payload;
            user = await this.userService.findByFirebaseId(user.user_id);
            console.log("user found", user);
            console.log('Decoded Token Dara:', user.email, user.user_id);
            if (!user) {
                user = decodedToken.payload;
                user = await this.userService.findOrCreate({
                    uid: user.user_id,
                    email: user.email,
                    role: 'user'
                });
            }
            req['user'] = user;
            next();
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
};
exports.AuthMiddleware = AuthMiddleware;
exports.AuthMiddleware = AuthMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService])
], AuthMiddleware);
//# sourceMappingURL=auth.middleware.js.map