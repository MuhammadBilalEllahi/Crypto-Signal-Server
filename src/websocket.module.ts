import { Module } from '@nestjs/common';
import { Server } from 'socket.io';

@Module({
  providers: [
    {
      provide: 'WEBSOCKET_SERVER',
      useFactory: () => new Server({ cors: { origin: '*' } }),
    },
  ],
  exports: ['WEBSOCKET_SERVER'],
})
export class WebSocketModule {}
