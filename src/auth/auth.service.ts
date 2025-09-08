import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../entities/user.entity';
import { CreateUserDto, LoginResponseDto } from '../dto/auth.dto';

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
}
