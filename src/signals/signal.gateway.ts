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
import { RedisService } from 'src/redis/redis.service';
import { UserSubscribe } from 'src/userSubscribes/userSubscribes.schema';
import { InjectModel } from '@nestjs/mongoose';
import { UserDocument } from 'src/user/user.schema';
import { User } from 'src/user/user.schema';
import { Model } from 'mongoose';

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
  private premiumUsers: Map<string, Socket> = new Map();


  constructor(@Inject(forwardRef(() => SignalService)) private readonly signalService: SignalService,
  private readonly redisService: RedisService,
  @InjectModel(User.name) private userModel: Model<UserDocument>) { } // ✅ Circ  ular dependency fix

  @WebSocketServer()
  private server: Server; // ✅ Directly using WebSocketServer avoids injection issues
  




  afterInit(server: Server) {
    console.log('WebSocket initialized at signals');
  }
  async handleConnection(client: Socket) {
    client.emit('new-signal')
    console.log(`Signal client connected: ${client.id}`);

    try {
      let token = client.handshake.query?.Authorization;
     // console.log("token in signal gateway socket", token);
      
      if (!token) {
        console.log('❌ No token provided. Disconnecting client...');
        client.disconnect();
        return;
      }
     // console.log("token in signal gateway socke-----------------------t", token);

      // Handle both string and array cases
      if (Array.isArray(token)) {
        token = token[0];
      }

      // Remove 'Bearer ' prefix if present
      if (token.startsWith('Bearer ')) {
        token = token.substring(7);
      }

      if (!token) {
        console.log('❌ Invalid token format. Disconnecting client...');
        client.disconnect();
        return;
      }

      const decodedToken = jwt.decode(token, { complete: true });
      //console.log("decodedToken in signal gateway socket", decodedToken);
      
      if (!decodedToken || !decodedToken.payload) {
        console.log('❌ Invalid Decoded Token:', decodedToken);
        client.disconnect();
        return;
      }

      const user = decodedToken.payload;
      // console.log("user in signal gateway socket", user);

      const uid = user.user_id as string;
      //console.log("_id in signal gateway socket", uid);

      const userdata = await this.userModel.findOne({uid: uid});

      if(!userdata){
        console.log("❌ User not found");
        client.disconnect();
        return;
      }

      const redisKey = `user_subscribe_status_${userdata._id as string}`;
      // console.log("redisKey in signal gateway socket", redisKey)
      const userSubscribeStatus = await this.redisService.get(redisKey) //as UserSubscribe;
      // console.log("userSubscribeStatus in signal gateway socket", userSubscribeStatus);
      const userSubscribeStatusData = JSON.parse(userSubscribeStatus as string) ;
      console.log("userSubscribeStatus status", userSubscribeStatusData?.['status'])

      if(userSubscribeStatusData?.['status'] === 'active'){
        console.log("INNNNNNNNNNNNNNNNNNsetting premium user", userdata._id as string)
        this.premiumUsers.set(userdata._id as string, client);
      }

      console.log("PREMIUM USERS", this.premiumUsers.keys())
    } catch (error) {
      console.error('Error in handleConnection:', error);
      client.emit('subscriptionError', { message: 'Failed to authenticate' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Signal client disconnected: ${client.id}`);
  }

  sendSignal(signal: any) {
    this.server.emit('new-signal', signal); // ✅ Broadcasting signal to all connected clients
  }

  sendToPremiumUsers(signal: any) {
    this.premiumUsers.forEach((client) => {
      client.emit('new-signal', signal); // ✅ Broadcasting signal to all connected clients
    });
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
