import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import {
  LoginResponseDto,
  RefreshTokenDto,
  RefreshResponseDto,
} from '../dto/auth.dto';
import { User } from '../entities/user.entity';
import { AUTH_CONSTANTS } from './auth.constants';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token using refresh token',
    description:
      'Exchange a valid refresh token for a new access token and refresh token pair',
  })
  // TODO: Consider supporting HttpOnly Secure cookies for refresh tokens.
  // - Set refresh token as a Secure, HttpOnly cookie on login/refresh (Set-Cookie)
  // - Read cookie server-side here when present (fall back to body/header)
  // - Use SameSite and/or CSRF tokens to mitigate CSRF when using cookies
  // - Rotate cookie value on refresh and update cookie attributes accordingly
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refresh successful',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshResponseDto> {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @Post('validate-refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate refresh token without generating new tokens',
    description:
      'Check if a refresh token is valid and return user information',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Refresh token is valid',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async validateRefreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const user = await this.authService.validateRefreshToken(
      refreshTokenDto.refreshToken,
    );
    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user (optional - for future token blacklisting)',
    description:
      'Invalidate refresh token for enhanced security (placeholder for future implementation)',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    // TODO: Implement token blacklisting/invalidation in the future
    // For now, just validate the token exists
    await this.authService.validateRefreshToken(refreshTokenDto.refreshToken);

    return {
      message: 'Logged out successfully',
      note: 'Client should discard stored tokens',
    };
  }

  @Get('profile')
  @UseGuards(AuthGuard(AUTH_CONSTANTS.PASSPORT.DEFAULT_STRATEGY))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @Delete('profile')
  @UseGuards(AuthGuard(AUTH_CONSTANTS.PASSPORT.DEFAULT_STRATEGY))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete current user account',
    description:
      'Permanently delete the authenticated user account and all associated data',
  })
  @ApiResponse({
    status: 204,
    description: 'User account successfully deleted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async deleteAccount(@Req() req: Request): Promise<void> {
    const user = req.user as User;
    return this.authService.deleteCurrentUser(user.id);
  }
}
