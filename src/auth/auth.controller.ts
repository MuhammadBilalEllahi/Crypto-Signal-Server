import { Body, Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { getEnabledCategories } from 'trace_events';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @Post('email/register')
  // async registerWithEmail(@Body() body: { email: string; password: string }) {
  //   const user = await this.authService.createUserWithEmail(
  //     body.email,
  //     body.password,
  //   );
  //   return this.authService.generateToken(user);
  // }

  @Post('phone/register')
  async registerWithPhone(@Body() body: { phoneNumber: string }) {
    const user = await this.authService.createUserWithPhone(body.phoneNumber);
    return this.authService.generateToken(user);
  }

  // @Post('phone/verify')
  // async verifyPhone(@Body() body: { phoneNumber: string }) {
  //   return await this.authService.verifyPhoneNumber(body.phoneNumber);
  // }

  @Post('password/reset')
  async resetPassword(@Body() body: { email: string }) {
    return await this.authService.sendPasswordResetEmail(body.email);
  }

  @Get('2fa/enable/get-secret')
  async enable2FA(@Req() req: Request & { user: any }) {
    const firebaseUid = req.user.uid as string;
    return await this.authService.enable2FA(firebaseUid);
  }

  @Post('2fa/verify-initialize')
  async verify2FA(@Body() body: { firebaseUid: string; code: string }) {
    console.log('HERE IAM VERIFYING2 ', body);
    return await this.authService.verifyForConnectFirstTime2FA(
      body.firebaseUid,
      body.code,
    );
  }

  @Post('2fa/verify-login')
  async verify2FALogin(@Body() body: { firebaseUid: string; code: string }) {
    console.log('HERE IAM VERIFYING2 ', body);
    return await this.authService.verifyForLogin2FA(
      body.firebaseUid,
      body.code,
    );
  }
}
