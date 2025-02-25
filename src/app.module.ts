/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatGateway } from './chat/chat.gateway';
import { ChatModule } from './chat/chat.module';
import { SignalModule } from './signals/signals.module';

@Module({
  imports: [
    ChatModule,
    SignalModule,
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost/trade-signals',
    ), // Connect to MongoDB
  ],
  controllers: [AppController],
  providers: [AppService, ChatGateway],
})
export class AppModule {}
