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

  // // Email Authentication
  // async createUserWithEmail(email: string, password: string) {
  //   try {
  //     const userRecord = await admin.auth().createUser({
  //       email,
  //       password,
  //       emailVerified: false,
  //     });

  //     await this.userService.createUser({
  //       uid: userRecord.uid,
  //       email: userRecord.email as string,
  //       role: 'user',
  //     });

  //     return userRecord;
  //   } catch (error) {
  //     throw new UnauthorizedException(error.message);
  //   }
  // }

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
  // async verifyPhoneNumber(phoneNumber: string) {
  //   try {
  //     return await admin.auth()(phoneNumber);
  //   } catch (error) {
  //     throw new UnauthorizedException(error.message);
  //   }
  // }

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
  async enable2FA(firebaseUid: string) {
    const userToCheck = await this.userService.getUserByUid(firebaseUid);
    console.log('2FA already enabled', userToCheck);
    if (userToCheck?.twoFactorVerified && userToCheck?.twoFactorEnabled) {
      return {
        alreadyEnabled: true,
        message: '2FA already enabled',
      };
    }
    const secret = speakeasy.generateSecret({
      name: 'TradingApp',
    });
    console.log('SECRET', secret);

    const user = await this.userService.update2FASecret(
      firebaseUid,
      secret.base32,
    );

    console.log('SECRET', secret, 'firebaseUid', firebaseUid, 'user', user);
    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
    };
  }

  async verifyForConnectFirstTime2FA(userId: string, code: string) {
    console.log('HERE IAM VERIFYING', userId, code);
    const user = await this.userService.getUserByUid(userId);
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA not enabled');
    }
    console.log('user', user, 'data', user.twoFactorSecret, 'code', code);
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    const expectedCode = speakeasy.totp({
      secret: user.twoFactorSecret,
      encoding: 'base32',
    });

    console.log('Expected Code:', expectedCode);
    console.log('Received Code:', code);

    console.log('verified', verified);

    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    await this.userService.update2FAVerifiedAndEnabled(userId, true);
    return {
      message: '2FA verified and enabled',
      success: true,
    };
  }

  async verifyForLogin2FA(userId: string, code: string) {
    console.log('HERE IAM VERIFYING', userId, code);
    const user = await this.userService.getUserByUid(userId);
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA not enabled');
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });
    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA token');
    }
    return {
      success: true,
      message: '2FA verified',
    };
  }

  // Generate JWT token
  async generateToken(user: any) {
    const payload = {
      sub: user.uid,
      email: user.email,
      role: user.role,
      _id: user._id,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
