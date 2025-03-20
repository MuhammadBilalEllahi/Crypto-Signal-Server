/* eslint-disable prettier/prettier */
// signal.module.ts
import { forwardRef, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SignalController } from './signal.controller';
import { SignalService } from './signal.service';
import { Signal, SignalSchema } from './signal.schema';
import { SignalGateway } from './signal.gateway';
import { AuthMiddleware } from 'src/auth/auth.middleware';
import { AdminMiddleware } from 'src/auth/admin.middleware';
import { UserModule } from 'src/user/user.module';
import { User, UserSchema } from 'src/user/user.schema';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: Signal.name, schema: SignalSchema }]),
    forwardRef(() => SignalModule),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RedisModule,
  ],
  controllers: [SignalController],
  providers: [SignalService, SignalGateway],
  exports: [SignalGateway, SignalService],
})
export class SignalModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(SignalController);
    consumer.apply(AdminMiddleware).forRoutes({ path: 'signals/admin/create', method: RequestMethod.POST });
  }
}