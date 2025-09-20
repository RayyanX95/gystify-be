import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  googleId: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gmailRefreshToken?: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Short-lived access token for API requests' })
  accessToken: string;

  @ApiProperty({ description: 'Long-lived refresh token for token renewal' })
  refreshToken: string;

  @ApiProperty({ description: 'Access token expiration time' })
  expiresIn: string;

  @ApiProperty({ description: 'Token type (Bearer)' })
  tokenType: string;

  @ApiProperty({ description: 'User profile information' })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token to exchange for new access token',
  })
  @IsString()
  refreshToken: string;
}

export class RefreshResponseDto {
  @ApiProperty({ description: 'New access token' })
  accessToken: string;

  @ApiProperty({ description: 'New refresh token (rotated for security)' })
  refreshToken: string;

  @ApiProperty({ description: 'Access token expiration time' })
  expiresIn: string;

  @ApiProperty({ description: 'Token type (Bearer)' })
  tokenType: string;
}
