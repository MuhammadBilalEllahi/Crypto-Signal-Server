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
exports.SignalGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const signal_service_1 = require("./signal.service");
let SignalGateway = class SignalGateway {
    signalService;
    constructor(signalService) {
        this.signalService = signalService;
    }
    server;
    afterInit(server) {
        console.log('WebSocket initialized at signals');
    }
    handleConnection(client) {
        client.emit('new-signal');
        console.log(`Signal client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`Signal client disconnected: ${client.id}`);
    }
    sendSignal(signal) {
        this.server.emit('new-signal', signal);
    }
    subscribeToSignals(client) {
        console.log(`Client subscribed to signals: ${client.id}`);
        client.emit("subscribedToSocket");
    }
};
exports.SignalGateway = SignalGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], SignalGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribeToSignals'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], SignalGateway.prototype, "subscribeToSignals", null);
exports.SignalGateway = SignalGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/signals',
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type'],
            credentials: true,
        },
        transports: ['websocket'],
    }),
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => signal_service_1.SignalService))),
    __metadata("design:paramtypes", [signal_service_1.SignalService])
], SignalGateway);
//# sourceMappingURL=signal.gateway.js.map