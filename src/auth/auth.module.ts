import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { AUTH_CONSTANTS } from './auth.constants';

@Module({
  imports: [
    UserModule,
    PassportModule.register({
      defaultStrategy: AUTH_CONSTANTS.PASSPORT.DEFAULT_STRATEGY,
      session: AUTH_CONSTANTS.PASSPORT.SESSION_ENABLED,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        const isProduction = nodeEnv === 'production';
        const jwtSecret = configService.get<string>('JWT_SECRET');
        const jwtExpiresIn =
          configService.get<string>('JWT_EXPIRES_IN') ||
          AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRES_IN;

        // Production environment validation for ACCESS TOKEN secret only
        if (isProduction && !jwtSecret) {
          throw new Error(
            'JWT_SECRET is required in production environment. ' +
              'Please set the JWT_SECRET environment variable.',
          );
        }
        // Note: JWT_REFRESH_SECRET validation is handled in AuthService
        // where refresh tokens are actually used

        // Use fallback secret only in development
        const secret =
          jwtSecret ||
          (isProduction
            ? undefined
            : AUTH_CONSTANTS.JWT.DEFAULT_DEVELOPMENT_SECRET);

        if (!secret) {
          throw new Error('JWT_SECRET configuration is invalid');
        }

        return {
          secret,
          signOptions: {
            expiresIn: jwtExpiresIn,
            issuer: AUTH_CONSTANTS.JWT.ISSUER,
            audience: AUTH_CONSTANTS.JWT.AUDIENCE,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, GoogleStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
