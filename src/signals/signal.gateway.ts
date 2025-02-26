import { Injectable } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/signals',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
  transports: ['websocket'],
}) // Ensuring cross-origin support
@Injectable()
export class SignalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server; // ✅ Directly using WebSocketServer avoids injection issues
  afterInit(server: Server) {
    console.log('WebSocket initialized at signals');
  }
  handleConnection(client: Socket) {
    console.log(`Signal client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Signal client disconnected: ${client.id}`);
  }

  sendSignal(signal: any) {
    this.server.emit('new-signal', signal); // ✅ Broadcasting signal to all connected clients
  }

  @SubscribeMessage('subscribeToSignals')
  subscribeToSignals(client: Socket) {
    console.log(`Client subscribed to signals: ${client.id}`);
    client.emit('subscriptionSuccess', { message: 'Subscribed to signals' });
  }
}
