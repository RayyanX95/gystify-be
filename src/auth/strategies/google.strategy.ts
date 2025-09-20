import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { AUTH_CONSTANTS } from '../auth.constants';

interface GoogleProfile {
  id: string;
  name: {
    givenName: string;
    familyName: string;
  };
  emails: Array<{ value: string }>;
  photos: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_FE_CALLBACK_URL') || '',
      scope: AUTH_CONSTANTS.GOOGLE.SCOPES,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    const user = {
      googleId: id,
      email: emails[0]?.value || '',
      firstName: name.givenName,
      lastName: name.familyName,
      profilePicture: photos[0]?.value,
      gmailRefreshToken: refreshToken,
      accessToken,
    };

    try {
      const validatedUser = await this.authService.validateGoogleUser(user);
      done(null, validatedUser);
    } catch (error) {
      done(error, false);
    }
  }
}
