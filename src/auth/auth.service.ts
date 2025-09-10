import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../entities/user.entity';
import { CreateUserDto, LoginResponseDto } from '../dto/auth.dto';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  gmailRefreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateGoogleUser(profile: GoogleUserProfile): Promise<User> {
    const {
      googleId,
      email,
      firstName,
      lastName,
      profilePicture,
      gmailRefreshToken,
    } = profile;

    let user = await this.userService.findByGoogleId(googleId);

    if (!user) {
      const createUserDto: CreateUserDto = {
        googleId,
        email,
        firstName,
        lastName,
        profilePicture,
        gmailRefreshToken,
      };
      user = await this.userService.create(createUserDto);
    } else if (gmailRefreshToken) {
      // Update refresh token if provided
      user = await this.userService.updateGmailRefreshToken(
        user.id,
        gmailRefreshToken,
      );
    }

    return user;
  }

  login(user: User): LoginResponseDto {
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
      },
    };
  }

  async validateUser(email: string): Promise<User> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  // Test method for development - remove in production
  async createTestUser(createUserDto: CreateUserDto): Promise<User> {
    // Generate a test Google ID if not provided
    const testUserData = {
      ...createUserDto,
      googleId: createUserDto.googleId || `test-${Date.now()}`,
    };

    return this.userService.create(testUserData);
  }

  // Exchange authorization code received from frontend for Google tokens,
  // fetch the user's profile, upsert user and return a JWT login response.
  async exchangeGoogleCode(
    code: string,
    redirectUri?: string,
  ): Promise<LoginResponseDto> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackUrl = redirectUri || process.env.GOOGLE_FE_CALLBACK_URL;

    // Guard against missing or placeholder credentials (e.g. from .env.example)
    const appearsPlaceholder = !clientId || !clientSecret;
    if (appearsPlaceholder) {
      throw new UnauthorizedException(
        'Google OAuth client ID/secret missing or left as placeholder. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the values from your Google Cloud Console and ensure GOOGLE_FE_CALLBACK_URL matches the OAuth redirect URI.',
      );
    }

    try {
      const client = new OAuth2Client(clientId, clientSecret, callbackUrl);

      // Exchange the authorization code for tokens
      const { tokens } = await client.getToken(code);

      client.setCredentials(tokens);

      // Fetch user profile
      const oauth2 = google.oauth2({ auth: client, version: 'v2' });
      const { data: profile } = await oauth2.userinfo.get();

      const googleProfile: GoogleUserProfile = {
        googleId: profile.id || '',
        email: profile.email || '',
        firstName: profile.given_name || '',
        lastName: profile.family_name || '',
        profilePicture: profile.picture ?? undefined,
        gmailRefreshToken: (tokens.refresh_token as string) ?? undefined,
      };

      const user = await this.validateGoogleUser(googleProfile);

      // Optionally store access token/meta if needed (currently we store refresh token)

      return this.login(user);
    } catch (error) {
      console.log('error :>> ', error);
      throw new UnauthorizedException('Invalid Google authentication');
    }
  }
}
