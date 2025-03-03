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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let ChatGateway = class ChatGateway {
    server;
    clients = new Set();
    afterInit(server) {
        console.log('WebSocket initialized');
    }
    sendMessageToClients(message) {
        this.server.emit('message', { sender: 'Server', message });
    }
    handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
        this.clients.add(client.id);
        this.server.emit('clients', Array.from(this.clients));
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
        this.clients.delete(client.id);
        this.server.emit('clients', Array.from(this.clients));
    }
    handleMessage(data) {
        console.log(`New message from ${data.sender}: ${data.message}`);
        this.server.emit('message', data);
    }
    async handleJoinRoom(client, room) {
        await client.join(room);
        this.server
            .to(room)
            .emit('message', {
            sender: 'Server',
            message: `User joined room ${room}`,
        });
    }
    handleMessageRoom(client, data) {
        this.server
            .to(data.room)
            .emit('message', { sender: client.id, message: data.message });
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('messageRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleMessageRoom", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: true })
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map