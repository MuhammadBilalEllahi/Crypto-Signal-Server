/* eslint-disable prettier/prettier */
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SignalService } from './signal.service';

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

  constructor(@Inject(forwardRef(() => SignalService)) private readonly signalService: SignalService) {} // ✅ Circular dependency fix
  
  @WebSocketServer()
  private server: Server; // ✅ Directly using WebSocketServer avoids injection issues
  afterInit(server: Server) {
    console.log('WebSocket initialized at signals');
  }
  handleConnection(client: Socket) {
    
    client.emit('new-signal')
    console.log(`Signal client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Signal client disconnected: ${client.id}`);
  }

  sendSignal(signal: any) {
    this.server.emit('new-signal', signal); // ✅ Broadcasting signal to all connected clients
  }

  // @SubscribeMessage('subscribeToSignals')
  // subscribeToSignals(client: Socket) {
  //   console.log(`Client subscribed to signals: ${client.id}`);
  //   client.emit('subscriptionSuccess', { message: 'Subscribed to signals' });
  // }

  // @SubscribeMessage('subscribeToSignals')
  // async subscribeToSignals(client: Socket) {
  //   console.log(`Client subscribed to signals: ${client.id}`);
  //   const signals = await this.signalService.findAll(); // Fetch signals
  //   client.emit('subscriptionSuccess', signals); // Send signals to the subscribing client
  // }
  

  @SubscribeMessage('subscribeToSignals')
async subscribeToSignals(client: Socket) {
  console.log(`Client subscribed to signals: ${client.id}`);
  
  try {
    const signals = await this.signalService.findAll(); // Fetch all signals
    client.emit('subscriptionSuccess', signals); // Send initial signals
  } catch (error) {
    console.error('Error fetching signals:', error);
    client.emit('subscriptionError', { message: 'Failed to fetch signals' });
  }
}

}
