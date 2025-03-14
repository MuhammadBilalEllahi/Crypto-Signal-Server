/* eslint-disable prettier/prettier */
import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
  }
}

@Injectable()
export class AdminMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== 'admin') {
      throw new ForbiddenException('Access denied. Admins only.');
    }
    next();
  }
}
