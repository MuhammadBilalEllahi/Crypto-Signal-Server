/* eslint-disable prettier/prettier */
import { Body, Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('email/register')
  async registerWithEmail(@Body() body: { email: string; password: string }) {
    const user = await this.authService.createUserWithEmail(
      body.email,
      body.password,
    );
    return this.authService.generateToken(user);
  }

  @Post('phone/register')
  async registerWithPhone(@Body() body: { phoneNumber: string }) {
    const user = await this.authService.createUserWithPhone(body.phoneNumber);
    return this.authService.generateToken(user);
  }

  @Post('phone/verify')
  async verifyPhone(@Body() body: { phoneNumber: string }) {
    return await this.authService.verifyPhoneNumber(body.phoneNumber);
  }

  @Post('password/reset')
  async resetPassword(@Body() body: { email: string }) {
    return await this.authService.sendPasswordResetEmail(body.email);
  }

  @Post('2fa/enable')
  async enable2FA(@Body() body: { userId: string }) {
    return await this.authService.enable2FA(body.userId);
  }

  @Post('2fa/verify')
  async verify2FA(@Body() body: { userId: string; token: string }) {
    return await this.authService.verify2FA(body.userId, body.token);
  }
}
