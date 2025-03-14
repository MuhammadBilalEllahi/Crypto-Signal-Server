/* eslint-disable prettier/prettier */
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
// import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../user/user.service';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  email: string;
  user_id: string;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private userService: UserService) { }

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('Token required');

    try {
      const decodedToken = jwt.decode(token, { complete: true });
      console.log("decoded", decodedToken);

      if (!decodedToken || !decodedToken.payload.sub) {
        console.log('Invalid Decoded Token:', decodedToken);
        return res.status(401).json({ message: 'Invalid token' });
      }

      const payload = decodedToken.payload as JwtPayload;
      if (!payload) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      let user = await this.userService.findByFirebaseId(payload.user_id);
      console.log("user found", user);

      if (!user) {
        user = await this.userService.findOrCreate({
          uid: payload.user_id,
          email: payload.email,
          role: 'user'
        });
      }

      req['user'] = user;
      next();
    } catch (error) {
      console.log("error", error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
