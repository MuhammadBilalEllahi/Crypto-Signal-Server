import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SignalService } from './signal.service';
export declare class SignalGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly signalService;
    constructor(signalService: SignalService);
    private server;
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    sendSignal(signal: any): void;
    subscribeToSignals(client: Socket): void;
}
