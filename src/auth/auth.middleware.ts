/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private userService: UserService) { }

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('Token required');


    try {
      // const decodedToken = await admin.auth().verifyIdToken(token);

      const decodedToken = jwt.decode(token, { complete: true })
      console.log("decoded", decodedToken)

      if (!decodedToken || !decodedToken.payload.sub) {
        console.log('Invalid Decoded Token:', decodedToken);
        return res.status(401).json({ message: 'Invalid token' });
      }
      let user = decodedToken.payload;
      if(!user){
        return res.status(401).json({ message: 'Invalid token' });
      }
      const {user_id}= user as any;

      user  = await this.userService.findByFirebaseId(user_id as string) as any;
      console.log("user found", user)

      


      // console.log('Decoded Token Dara:', userObj.email, userObj.user_id);
      // await  this.userService.setUserRole(user.user_id)


      if(!user){
        user = decodedToken.payload;
        user = await this.userService.findOrCreate({
          uid: user.user_id ,
          email: user.email ,
          role: 'user'
        });
      }
      req['user'] = user;
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
