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
exports.FirebaseAuthMiddleware = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("../user/user.service");
const jwt = require("jsonwebtoken");
let FirebaseAuthMiddleware = class FirebaseAuthMiddleware {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async use(req, res, next) {
        console.log("REQ", req.headers.authorization);
        if (!req.headers.authorization) {
            console.log("Unauthorized");
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const token = req.headers.authorization.split('Bearer ')[1];
        console.log("bearer");
        if (!token) {
            console.log("no token");
            return res.status(401).json({ message: 'Invalid token' });
        }
        try {
            console.log("TOKEn", token);
            const decodedToken = jwt.decode(token, { complete: true });
            console.log("decoded", decodedToken.payload);
            let user = decodedToken.payload;
            console.log("user ", user);
            if (!decodedToken || !user.sub) {
                console.log('Invalid Decoded Token:', decodedToken);
                return res.status(401).json({ message: 'Invalid token' });
            }
            console.log('Decoded Token:', user);
            console.log('Decoded Token Dara:', user.email, user.user_id);
            user = await this.userService.findByFirebaseId(user.user_id);
            console.log("is found", user);
            if (!user) {
                user = decodedToken.payload;
                user = await this.userService.findOrCreate({
                    uid: user.user_id,
                    email: user.email,
                    role: 'user',
                });
            }
            req.user = user;
            next();
        }
        catch (error) {
            console.log("Error", error);
            return res.status(401).json({ message: 'Authentication failed' });
        }
    }
};
exports.FirebaseAuthMiddleware = FirebaseAuthMiddleware;
exports.FirebaseAuthMiddleware = FirebaseAuthMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService])
], FirebaseAuthMiddleware);
//# sourceMappingURL=firebase-auth.middleware.js.map