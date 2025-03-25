/* eslint-disable prettier/prettier */
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// import { AppController } from './app.controller';
import { SignalModule } from './signals/signals.module';
import { WebSocketModule } from './websocket.module';
import { UserModule } from './user/user.module';
import { FirebaseAuthMiddleware } from './auth/firebase-auth.middleware';
import { AdminMiddleware } from './auth/admin.middleware';
import { ConfigModule } from '@nestjs/config';
import { NewsAlertModule } from './news-alerts/news-alert.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGO_DB_URI as string || 'mongodb://localhost/trade-signals',
    ), // 
    //Connect to MongoDB
    AuthModule,
    UserModule,
    SignalModule,
    NewsAlertModule,
    WebSocketModule,
    RedisModule,
    
  ],
  // controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FirebaseAuthMiddleware).forRoutes('*'); // Apply to all routes
    consumer.apply(AdminMiddleware).forRoutes({ path: 'signals/admin/create', method: RequestMethod.POST }); // Protect signals (POST)
    

  }
}