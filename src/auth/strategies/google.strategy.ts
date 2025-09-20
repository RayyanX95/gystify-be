import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  StrategyOptions,
  VerifyCallback,
} from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { AUTH_CONSTANTS } from '../auth.constants';

interface GoogleProfile {
  id: string;
  name: {
    givenName: string;
    familyName: string;
  };
  emails: Array<{ value: string; verified: boolean }>;
  photos: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const options: StrategyOptions = {
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_FE_CALLBACK_URL') || '',
      scope: AUTH_CONSTANTS.GOOGLE.SCOPES as unknown as string[],
    };

    super(options);

    // Validate required configuration in production
    const nodeEnv = configService.get<string>('NODE_ENV');
    if (nodeEnv === 'production') {
      if (!options.clientID || !options.clientSecret || !options.callbackURL) {
        throw new Error(
          'Google OAuth configuration is incomplete. Please check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_FE_CALLBACK_URL environment variables.',
        );
      }
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    // Enhanced validation
    if (!emails || emails.length === 0) {
      return done(new Error('No email found in Google profile'), false);
    }

    const primaryEmail = emails.find((email) => email.verified) || emails[0];

    const user = {
      googleId: id,
      email: primaryEmail.value,
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      profilePicture: photos?.[0]?.value,
      gmailRefreshToken: refreshToken,
      accessToken,
    };

    try {
      const validatedUser = await this.authService.validateGoogleUser(user);
      done(null, validatedUser);
    } catch (error) {
      console.error('Google OAuth validation error:', error);
      done(error, false);
    }
  }
}
