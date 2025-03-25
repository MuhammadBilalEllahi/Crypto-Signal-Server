/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as admin from 'firebase-admin';
import * as speakeasy from 'speakeasy';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  // Email Authentication
  async createUserWithEmail(email: string, password: string) {
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        emailVerified: false,
      });

      await this.userService.createUser({
        uid: userRecord.uid,
        email: userRecord.email,
        role: 'user',
      });

      return userRecord;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  // Phone Authentication
  async createUserWithPhone(phoneNumber: string) {
    try {
      const userRecord = await admin.auth().createUser({
        phoneNumber,
      });

      await this.userService.createUser({
        uid: userRecord.uid,
        email: `${userRecord.uid}@phone.user`,
        role: 'user',
      });

      return userRecord;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  // Verify Phone Number
  async verifyPhoneNumber(phoneNumber: string) {
    try {
      return await admin.auth().generatePhoneVerificationCode(phoneNumber);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  // Password Reset
  async sendPasswordResetEmail(email: string) {
    try {
      const actionCodeSettings = {
        url:
          process.env.PASSWORD_RESET_URL ||
          'http://localhost:3000/reset-password',
        handleCodeInApp: true,
      };

      return await admin
        .auth()
        .generatePasswordResetLink(email, actionCodeSettings);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  // 2FA
  async enable2FA(userId: string) {
    const secret = speakeasy.generateSecret({
      name: 'TradingApp',
    });

    await this.userService.update2FASecret(userId, secret.base32);

    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
    };
  }

  async verify2FA(userId: string, token: string) {
    const user = await this.userService.getUserById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA not enabled');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    return true;
  }

  // Generate JWT token
  async generateToken(user: any) {
    const payload = {
      sub: user.uid,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
