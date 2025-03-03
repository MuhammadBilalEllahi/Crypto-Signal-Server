import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private clients;
    afterInit(server: Server): void;
    sendMessageToClients(message: string): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleMessage(data: {
        sender: string;
        message: string;
    }): void;
    handleJoinRoom(client: Socket, room: string): Promise<void>;
    handleMessageRoom(client: Socket, data: {
        room: string;
        message: string;
    }): void;
}
