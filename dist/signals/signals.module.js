"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const signal_controller_1 = require("./signal.controller");
const signal_service_1 = require("./signal.service");
const signal_schema_1 = require("./signal.schema");
const signal_gateway_1 = require("./signal.gateway");
const auth_middleware_1 = require("../auth/auth.middleware");
const admin_middleware_1 = require("../auth/admin.middleware");
const user_module_1 = require("../user/user.module");
const user_schema_1 = require("../user/user.schema");
let SignalModule = class SignalModule {
    configure(consumer) {
        consumer.apply(auth_middleware_1.AuthMiddleware).forRoutes(signal_controller_1.SignalController);
        consumer.apply(admin_middleware_1.AdminMiddleware).forRoutes({ path: 'signals/admin/create', method: common_1.RequestMethod.POST });
    }
};
exports.SignalModule = SignalModule;
exports.SignalModule = SignalModule = __decorate([
    (0, common_1.Module)({
        imports: [
            user_module_1.UserModule,
            mongoose_1.MongooseModule.forFeature([{ name: signal_schema_1.Signal.name, schema: signal_schema_1.SignalSchema }]),
            (0, common_1.forwardRef)(() => SignalModule),
            mongoose_1.MongooseModule.forFeature([{ name: user_schema_1.User.name, schema: user_schema_1.UserSchema }]),
        ],
        controllers: [signal_controller_1.SignalController],
        providers: [signal_service_1.SignalService, signal_gateway_1.SignalGateway],
        exports: [signal_gateway_1.SignalGateway, signal_service_1.SignalService],
    })
], SignalModule);
//# sourceMappingURL=signals.module.js.map