/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  email: string;
  user_id: string;
}

@Injectable()
export class FirebaseAuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) { }

  async use(req: any, res: any, next: () => void) {
    console.log("REQ", req.headers.authorization);
    if (!req.headers.authorization) {
      console.log("Unauthorized");
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = req.headers.authorization.split('Bearer ')[1];
    console.log("bearer");
    if (!token) {
      console.log("no token");
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      console.log("TOKEN", token);
      // const decodedToken = await admin.auth().verifyIdToken(token,false);
      const decodedToken = jwt.decode(token, { complete: true });
      if (!decodedToken) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      const payload = decodedToken.payload as JwtPayload;
      console.log("decoded", payload);

      if (!payload || !payload.sub) {
        console.log('Invalid Decoded Token:', decodedToken);
        return res.status(401).json({ message: 'Invalid token payload' });
      }

      console.log('Decoded Token:', payload);
      console.log('Decoded Token Data:', payload.email, payload.user_id);

      let user = await this.userService.findByFirebaseId(payload.user_id);

      console.log("is found", user);
      if (!user) {
        user = await this.userService.findOrCreate({
          uid: payload.user_id,
          email: payload.email,
          role: 'user', // Default to 'user'
        });
      }
      console.log("user foundxx", user);

      req.user = user; // Attach user object to request
      console.log("req.user", req.user);
      next();
    } catch (error) {
      console.log("Error", error);
      return res.status(401).json({ message: 'Authentication failed' });
    }
  }
}
