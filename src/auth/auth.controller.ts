import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginResponseDto } from '../dto/auth.dto';
import { User } from '../entities/user.entity';
import { AUTH_CONSTANTS } from './auth.constants';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  googleAuth() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const loginResponse = this.authService.login(user);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${loginResponse.accessToken}`;

    res.redirect(redirectUrl);
  }

  @Post('google/exchange')
  @ApiOperation({ summary: 'Exchange Google authorization code for tokens' })
  @ApiResponse({
    status: 200,
    description: 'Exchange successful',
    type: LoginResponseDto,
  })
  async exchangeCode(
    @Body() body: { code: string; state?: string; redirectUri?: string },
  ) {
    const { code, redirectUri } = body;
    return this.authService.exchangeGoogleCode(code, redirectUri);
  }

  @Get('profile')
  @UseGuards(AuthGuard(AUTH_CONSTANTS.PASSPORT.DEFAULT_STRATEGY))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
