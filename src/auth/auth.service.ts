import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from '../subscription/subscription.service';
import { User } from '../entities/user.entity';
import { SubscriptionTier } from '../entities/subscription-plan.entity';
import {
  CreateUserDto,
  LoginResponseDto,
  RefreshResponseDto,
} from '../dto/auth.dto';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { AUTH_CONSTANTS } from './auth.constants';

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  gmailRefreshToken?: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  type: string;
  iat: number;
  exp: number;
}

/**
 * Utility function to safely extract error message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private subscriptionService: SubscriptionService,
  ) {
    // Validate refresh token secret in production
    this.validateRefreshTokenSecret();
  }

  /**
   * Validate that JWT_REFRESH_SECRET is properly configured in production
   */
  private validateRefreshTokenSecret(): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const isProduction = nodeEnv === 'production';

    if (isProduction) {
      const jwtRefreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!jwtRefreshSecret) {
        throw new Error(
          'JWT_REFRESH_SECRET is required in production environment. ' +
            'Please set the JWT_REFRESH_SECRET environment variable.',
        );
      }
    }
  }

  /**
   * Get the appropriate refresh token secret
   */
  private getRefreshTokenSecret(): string {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const isProduction = nodeEnv === 'production';
    const jwtRefreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');
    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    if (isProduction) {
      // In production, JWT_REFRESH_SECRET is required (validated in constructor)
      return jwtRefreshSecret!;
    } else {
      // In development, fallback to JWT_SECRET if JWT_REFRESH_SECRET not set
      return (
        jwtRefreshSecret ||
        jwtSecret ||
        AUTH_CONSTANTS.JWT.DEFAULT_DEVELOPMENT_SECRET
      );
    }
  }

  async validateGoogleUser(profile: GoogleUserProfile): Promise<User> {
    const {
      googleId,
      email,
      firstName,
      lastName,
      profilePicture,
      gmailRefreshToken,
    } = profile;

    let user = await this.findUserByGoogleId(googleId);
    console.log('Existing user by Google ID:', user);

    // If no user found by Google ID, check by email for inactive accounts
    if (!user) {
      user = await this.findUserByEmail(email);
      console.log('Existing user by email:', user);
    }

    // Handle different scenarios
    if (!user) {
      // No user found at all - create new user
      const createUserDto: CreateUserDto = {
        googleId,
        email,
        firstName,
        lastName,
        profilePicture,
        gmailRefreshToken,
      };
      user = await this.createUser(createUserDto);
    } else if (user.isActive === false) {
      // User exists but is inactive - reactivate with fresh data
      console.log(
        'Reactivating deleted user and cleaning up old data:',
        user.email,
      );

      // Clean up old user data first
      await this.cleanupUserData(user.id);

      // Reset user to fresh state
      await this.userRepository.update(user.id, {
        googleId,
        firstName,
        lastName,
        profilePicture,
        gmailRefreshToken,
        isActive: true,
        // Reset usage counters to zero for fresh start
        snapshotsCreatedToday: 0,
        totalSnapshotsCreated: 0,
        emailsSummarizedToday: 0,
        totalEmailsSummarized: 0,
        lastSnapshotDate: undefined,
        lastUsageResetDate: undefined,
        // Reset subscription to FREE tier for fresh start
        subscriptionTier: SubscriptionTier.FREE,
        billingCycle: undefined,
        trialStartedAt: undefined,
        trialExpiresAt: undefined,
        subscriptionStartedAt: undefined,
        subscriptionExpiresAt: undefined,
        stripeCustomerId: undefined,
        stripeSubscriptionId: undefined,
      });

      // Fetch the updated user
      user = await this.findUserById(user.id);
      console.log('User reactivated with fresh state:', user.email);

      // Note: Trial is NOT auto-started. Users must explicitly start trial
      // or subscribe when they try to create their first snapshot.
      // This creates better conversion pressure and sales opportunities.
    } else if (user.isActive === true && gmailRefreshToken) {
      // Update refresh token if provided
      user = await this.updateGmailRefreshToken(user.id, gmailRefreshToken);
    }

    return user;
  }

  /**
   * Generate both access and refresh tokens for a user
   */
  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = {
      email: user.email,
      sub: user.id,
      iat: Math.floor(Date.now() / 1000),
    };

    // Access Token (short-lived) - uses JwtModule default configuration
    const accessToken = this.jwtService.sign({
      ...payload,
      type: AUTH_CONSTANTS.TOKEN_TYPES.ACCESS,
    });

    // Refresh Token (longer-lived) - uses explicit configuration
    const refreshToken = this.jwtService.sign(
      { ...payload, type: AUTH_CONSTANTS.TOKEN_TYPES.REFRESH },
      {
        expiresIn: AUTH_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRES_IN,
        secret: this.getRefreshTokenSecret(),
        issuer: AUTH_CONSTANTS.JWT.ISSUER,
        audience: AUTH_CONSTANTS.JWT.AUDIENCE,
      },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Enhanced login method returning both tokens
   */
  login(user: User): LoginResponseDto {
    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRES_IN,
      tokenType: 'Bearer',
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
    const user = await this.findUserByEmail(email);
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

    return this.createUser(testUserData);
  }

  // Exchange authorization code received from frontend for Google tokens,
  // fetch the user's profile, upsert user and return a JWT login response.
  async exchangeGoogleCode(
    code: string,
    redirectUri?: string,
  ): Promise<LoginResponseDto> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl =
      redirectUri || this.configService.get<string>('GOOGLE_FE_CALLBACK_URL');

    console.log('###### redirectUri:', redirectUri);

    // Guard against missing or placeholder credentials
    if (!clientId || !clientSecret) {
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
      return this.login(user);
    } catch (error: unknown) {
      console.log('Google OAuth exchange failed:', JSON.stringify(error));

      const errorMessage = getErrorMessage(error);
      console.log('Google OAuth exchange failed:', errorMessage);

      // Provide more specific error handling for different scenarios
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid Google authentication');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshResponseDto> {
    try {
      // Verify refresh token with refresh secret
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.getRefreshTokenSecret(),
          issuer: AUTH_CONSTANTS.JWT.ISSUER,
          audience: AUTH_CONSTANTS.JWT.AUDIENCE,
        },
      );

      // Validate token type
      if (payload.type !== AUTH_CONSTANTS.TOKEN_TYPES.REFRESH) {
        throw new UnauthorizedException('Invalid token type');
      }

      // Get fresh user data
      const user = await this.findUserById(payload.sub);

      // Generate new tokens
      const tokens = this.generateTokens(user);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken, // Rotate refresh token for security
        expiresIn: AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRES_IN,
        tokenType: 'Bearer',
      };
    } catch (error: unknown) {
      // Proper error handling with type safety
      const errorMessage = getErrorMessage(error);
      console.error('Refresh token validation failed:', errorMessage);

      // Re-throw known error types, wrap unknown errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Validate refresh token without generating new tokens
   */
  async validateRefreshToken(refreshToken: string): Promise<User> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.getRefreshTokenSecret(),
          issuer: AUTH_CONSTANTS.JWT.ISSUER,
          audience: AUTH_CONSTANTS.JWT.AUDIENCE,
        },
      );

      if (payload.type !== AUTH_CONSTANTS.TOKEN_TYPES.REFRESH) {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.findUserById(payload.sub);

      return user;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      console.error('Refresh token validation failed:', errorMessage);

      // Re-throw known error types, wrap unknown errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ============ User Management Methods ============

  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async updateGmailRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<User> {
    await this.userRepository.update(userId, {
      gmailRefreshToken: refreshToken,
    });
    return this.findUserById(userId);
  }

  /**
   * Delete the current authenticated user account and handle all associated data
   * @param userId - ID of the user to delete
   */
  async deleteCurrentUser(userId: string): Promise<void> {
    const user = await this.findUserById(userId);

    try {
      // 1. Cancel any active subscriptions first to prevent billing issues
      // TODO: Implement subscription cancellation if method exists
      // await this.subscriptionService.cancelUserSubscriptions(userId);

      // 2. Handle data cleanup based on business requirements
      await this.cleanupUserData(userId);

      // 3. Soft delete: Mark account as deleted and reset all user data
      // This ensures clean state if user ever reactivates
      await this.userRepository.update(userId, {
        isActive: false,
        firstName: 'Deleted',
        lastName: 'User',
        profilePicture: undefined,
        gmailRefreshToken: undefined,
        // Reset all usage counters
        snapshotsCreatedToday: 0,
        totalSnapshotsCreated: 0,
        emailsSummarizedToday: 0,
        totalEmailsSummarized: 0,
        lastSnapshotDate: undefined,
        lastUsageResetDate: undefined,
        // Reset subscription to FREE tier
        subscriptionTier: SubscriptionTier.FREE,
        billingCycle: undefined,
        trialStartedAt: undefined,
        trialExpiresAt: undefined,
        subscriptionStartedAt: undefined,
        subscriptionExpiresAt: undefined,
        stripeCustomerId: undefined,
        stripeSubscriptionId: undefined,
        // Keep email for business purposes (newsletters, prevent reregistration issues)
      });

      // 4. Log the deletion for audit and business intelligence
      console.log(
        `User account soft-deleted: ${user.email} (ID: ${userId}) at ${new Date().toISOString()}`,
      );

      // Note: We keep the user record with email for:
      // - Marketing/newsletter purposes
      // - Preventing account recreation issues
      // - Business analytics and user lifecycle tracking
      // - Compliance with data retention policies
    } catch (error) {
      console.error(`Failed to delete user account ${userId}:`, error);
      throw new Error(
        'Failed to delete account. Please try again or contact support.',
      );
    }
  }

  /**
   * Clean up user-related data (snapshots, interactions, senders)
   * Preserves user record and subscription history for business purposes
   */
  private async cleanupUserData(userId: string): Promise<void> {
    try {
      // Get DataSource from userRepository to access other repositories
      const dataSource = this.userRepository.manager;

      // Use transaction to ensure data consistency
      await dataSource.transaction(async (transactionalEntityManager) => {
        // 1. Delete user interactions/analytics data
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from('user_interactions')
          .where('user_id = :userId', { userId })
          .execute();

        // 2. Delete snapshot items first (due to foreign key constraints)
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from('snapshot_items')
          .where(
            'snapshot_id IN (SELECT id FROM snapshots WHERE user_id = :userId)',
            { userId },
          )
          .execute();

        // 3. Delete snapshots
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from('snapshots')
          .where('user_id = :userId', { userId })
          .execute();

        // 4. Delete user-specific senders
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from('senders')
          .where('user_id = :userId', { userId })
          .execute();
      });

      // Note: We preserve:
      // - User record (for email and audit trail)
      // - Subscription history (for financial/legal compliance)
      // - Any audit logs (for security compliance)

      console.log(`User data cleanup completed for user ID: ${userId}`);
    } catch (error) {
      console.error(`Failed to cleanup user data for ${userId}:`, error);
      throw new Error('Failed to cleanup user data during account deletion');
    }
  }

  /**
   * Complete hard delete (for GDPR right to be forgotten requests)
   * This should be a separate endpoint with additional verification
   */
  async hardDeleteUser(
    userId: string,
    adminConfirmation: boolean = false,
  ): Promise<void> {
    if (!adminConfirmation) {
      throw new Error(
        'Hard delete requires admin confirmation for GDPR compliance',
      );
    }

    const user = await this.findUserById(userId);

    try {
      // Complete data cleanup
      await this.cleanupUserData(userId);

      // Cancel subscriptions
      // TODO: Implement subscription cancellation if method exists
      // await this.subscriptionService.cancelUserSubscriptions(userId);

      // Complete removal from database
      await this.userRepository.remove(user);

      console.log(
        `User HARD deleted for GDPR compliance: ${user.email} (ID: ${userId})`,
      );
    } catch (error) {
      console.error(`Failed to hard delete user ${userId}:`, error);
      throw new Error('Failed to perform GDPR deletion');
    }
  }
}
