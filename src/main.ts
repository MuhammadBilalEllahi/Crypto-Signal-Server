/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

import * as morgan from'morgan';
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(require('../trading-app-1bc0e-firebase-adminsdk-fbsvc-1dee713265.json')),
});


 
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // console.log("ADMIN", (await admin.auth().listUsers()).users)
  app.use(morgan('dev')); 

  app.enableCors();
  app.useWebSocketAdapter(new IoAdapter(app)); // Allow WebSocket connections
 
  // await app.listen(process.env.PORT ?? 3000);
  await app.listen(4000, () => {
    console.log('Connected at port 4000');
  });
}
bootstrap();
