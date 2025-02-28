/* eslint-disable prettier/prettier */
// import {
//   Injectable,
//   NestMiddleware,
//   ForbiddenException,
// } from '@nestjs/common';
// import { Request, Response, NextFunction } from 'express';

// @Injectable()
// export class AdminMiddleware implements NestMiddleware {
//    use(req: Request, res: Response, next: NextFunction) {
//     if (!req['user'] || req['user'].role !== 'admin') {
//       throw new ForbiddenException('Admin access required');
//     }
//     next();
//   }
// }


/* eslint-disable prettier/prettier */
import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class AdminMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
  }
}
