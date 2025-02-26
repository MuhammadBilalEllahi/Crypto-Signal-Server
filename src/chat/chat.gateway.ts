import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true }) // Enable CORS for WebSocket
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private clients = new Set<string>();

  afterInit(server: Server) {
    console.log('WebSocket initialized');
  }

  sendMessageToClients(message: string) {
    this.server.emit('message', { sender: 'Server', message });
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.clients.add(client.id);
    this.server.emit('clients', Array.from(this.clients)); // Notify all clients
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.clients.delete(client.id);
    this.server.emit('clients', Array.from(this.clients));
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: { sender: string; message: string }) {
    console.log(`New message from ${data.sender}: ${data.message}`);
    this.server.emit('message', data); // Broadcast message to all connected clients
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, room: string) {
    await client.join(room);
    this.server
      .to(room)
      .emit('message', {
        sender: 'Server',
        message: `User joined room ${room}`,
      });
  }

  @SubscribeMessage('messageRoom')
  handleMessageRoom(client: Socket, data: { room: string; message: string }) {
    this.server
      .to(data.room)
      .emit('message', { sender: client.id, message: data.message });
  }
}
