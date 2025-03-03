/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

import * as morgan from'morgan';
import * as admin from 'firebase-admin';
// import * as ngrok from 'ngrok';

admin.initializeApp({
  credential: admin.credential.cert(require('../trading-app-1bc0e-firebase-adminsdk-fbsvc-1dee713265.json')),
});


 
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // console.log("ADMIN", (await admin.auth().listUsers()).users)
  app.use(morgan('dev')); 

  // app.enableCors();
  app.enableCors({
    origin: '*', // Allow all origins
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });
  
  app.useWebSocketAdapter(new IoAdapter(app)); // Allow WebSocket connections
 
  // await app.listen(process.env.PORT ?? 3000);
  

   // Start listening on a specific port
   const PORT = process.env.PORT || 4000;
   await app.listen(PORT, '0.0.0.0', () =>  {
    console.log('Connected at port 4000');
  },);


  // // Start ngrok and expose the server
  // // const url = await ngrok.connect(PORT);
  // const url = await ngrok.connect({
  //   addr: PORT,
  //   authtoken: '2tjaW840lu68c6DDHY07LD3tTGo_6yaGzSgGN4gyZvL8HaKDY',
  //   domain: 'https://funky-frank-wolf.ngrok-free.app',
  //   region: 'us', // Change region if needed
  // });
  
  // console.log(`🚀 Server is running on http://localhost:${PORT}`);
  // console.log(`🌍 ngrok URL: ${url}`);
}
bootstrap();
