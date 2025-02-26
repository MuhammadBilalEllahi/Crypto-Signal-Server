// signal.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SignalController } from './signal.controller';
import { SignalService } from './signal.service';
import { Signal, SignalSchema } from './signal.schema';
import { SignalGateway } from './signal.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Signal.name, schema: SignalSchema }]),
  ],
  controllers: [SignalController],
  providers: [SignalService, SignalGateway],
  exports: [SignalGateway], //  Make it accessible in other modules
})
export class SignalModule {}
