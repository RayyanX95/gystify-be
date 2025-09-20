import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SnapshotService } from './snapshot.service';
import {
  CreateSnapshotResponseDto,
  SnapshotResponseDto,
  SnapshotWithItemsResponseDto,
} from './dto';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { User } from 'src/entities';
import { AUTH_CONSTANTS } from '../auth/auth.constants';

@ApiTags('Snapshots')
@Controller('snapshots')
@ApiBearerAuth()
@UseGuards(AuthGuard(AUTH_CONSTANTS.PASSPORT.DEFAULT_STRATEGY))
export class SnapshotController {
  constructor(private readonly snapshotService: SnapshotService) {}

  /**
   * Get all user's snapshots
   */
  @Get()
  @ApiOperation({ summary: "Get user's snapshots" })
  @ApiOkResponse({
    description: "List of user's snapshots",
    type: SnapshotResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getUserSnapshots(@Req() req: Request): Promise<SnapshotResponseDto[]> {
    const user = req.user as User;

    return this.snapshotService.getUserSnapshots(user.id);
  }

  /**
   * Get specific snapshot with items and streamlined UI data
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get specific snapshot with items' })
  @ApiParam({ name: 'id', description: 'Snapshot ID' })
  @ApiOkResponse({
    description: 'Snapshot with items',
    type: SnapshotWithItemsResponseDto,
  })
  async getSnapshotWithItems(
    @Req() req: Request,
    @Param('id') snapshotId: string,
  ): Promise<SnapshotWithItemsResponseDto> {
    const user = req.user as User;
    return this.snapshotService.getSnapshotWithItems(user.id, snapshotId);
  }

  /**
   * Create new snapshot from unread emails
   */
  @Post()
  @ApiOperation({ summary: 'Create new snapshot from unread emails' })
  @ApiCreatedResponse({
    description: 'Snapshot created',
    type: CreateSnapshotResponseDto,
  })
  async createSnapshot(
    @Req() req: Request,
  ): Promise<CreateSnapshotResponseDto> {
    const user = req.user as User;
    return this.snapshotService.createSnapshot(user);
  }
}
