import {
  Injectable,
  NotFoundException,
  // UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { AUTH_CONSTANTS } from '../auth.constants';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // JWT secret and validation is handled by JwtModule in auth.module.ts
    // We only need to specify the extraction method and validation options
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        AUTH_CONSTANTS.JWT.DEFAULT_DEVELOPMENT_SECRET,
      issuer: AUTH_CONSTANTS.JWT.ISSUER,
      audience: AUTH_CONSTANTS.JWT.AUDIENCE,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.findUserById(payload.sub);

    // Check if user account is still active
    if (!user.isActive) {
      throw new NotFoundException('Account has been deleted or deactivated');
    }

    return user;
  }
}
