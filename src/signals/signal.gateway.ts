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
import * as jwt from 'jsonwebtoken';

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

  constructor(@Inject(forwardRef(() => SignalService)) private readonly signalService: SignalService) { } // ✅ Circular dependency fix

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

  @SubscribeMessage('subscribeToSignals')
   subscribeToSignals(client: Socket) {
    console.log(`Client subscribed to signals: ${client.id}`);
    client.emit("subscribedToSocket")

    // try {
    //   let token = client.handshake.query?.Authorization;

    //   // Ensure token is a string (handle cases where it's an array)
    //   if (Array.isArray(token)) {
    //     token = token[0]; // Get the first element
    //   }

    //   if (!token) {
    //     console.log('❌ No token provided. Disconnecting client...');
    //     client.disconnect();
    //     return;
    //   }

    //   token = token.split(' ')[1]; // Extract token from "Bearer <token>"


    //   const decodedToken = jwt.decode(token, { complete: true })
    //   console.log("decoded", decodedToken.payload)
    //   const user = decodedToken.payload;

    //   console.log("user ", user)

    //   if (!decodedToken || !user.sub) {
    //     console.log('Invalid Decoded Token:', decodedToken);
    //     client.disconnect();
    //     return;
    //   }

    //   console.log('Decoded Token:', user);
    //   console.log('Decoded Token Dara:', user.email, user.user_id);
    //   // Auto-create user if not found
    //   const uid = user.user_id as string;


    //   const signals = await this.signalService.findAll(); // Fetch all signals
    //   client.emit('subscriptionSuccess', signals); // Send initial signals
    // } catch (error) {
    //   console.error('Error fetching signals:', error);
    //   client.emit('subscriptionError', { message: 'Failed to fetch signals' });
    // }
  }

}
