/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Injectable, NestMiddleware } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UserService } from '../user/user.service';
import * as jwt from 'jsonwebtoken';
@Injectable()
export class FirebaseAuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) { }

  async use(req: any, res: any, next: () => void) {
    console.log("REQ", req.headers.authorization)
    if (!req.headers.authorization) {
      console.log("Unauthorized")
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = req.headers.authorization.split('Bearer ')[1];
    console.log("bearer")
    if (!token) {
      console.log("no token")
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      console.log("TOKEn", token)
      // const decodedToken = await admin.auth().verifyIdToken(token,false);
      const decodedToken = jwt.decode(token, { complete: true })
      console.log("decoded", decodedToken.payload)
      let user = decodedToken.payload;

      console.log("user ", user)

      if (!decodedToken || !user.sub) {
        console.log('Invalid Decoded Token:', decodedToken);
        return res.status(401).json({ message: 'Invalid token' });
      }

      console.log('Decoded Token:', user);
      console.log('Decoded Token Dara:', user.email, user.user_id);
      // Auto-create user if not found

      user = await this.userService.findByFirebaseId(user.user_id as string);

      console.log("is found", user)
      if (!user) {
        user = decodedToken.payload;
        user = await this.userService.findOrCreate({
          uid: user.user_id,
          email: user.email,
          role: 'user', // Default to 'user'
        });
      }

      req.user = user; // Attach user object to request
      next();
    } catch (error) {
      console.log("Error", error)
      return res.status(401).json({ message: 'Authentication failed' });
    }
  }
}
