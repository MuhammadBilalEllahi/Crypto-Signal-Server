import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } }) // Ensure CORS is enabled
export class SignalGateway implements OnGatewayConnection {
  constructor() {
    console.log('SignalGateway initialized');
  }

  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log('Client connected:', client.id);
  }

  sendSignal(signal: any) {
    this.server.emit('newSignal', signal);
    console.log('Emitting signal:', signal);
  }
}
