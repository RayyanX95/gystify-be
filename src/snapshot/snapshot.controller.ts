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
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { User } from 'src/entities';
import { AUTH_CONSTANTS } from '../auth/auth.constants';

@Controller('snapshots')
@ApiBearerAuth()
@UseGuards(AuthGuard(AUTH_CONSTANTS.PASSPORT.DEFAULT_STRATEGY))
export class SnapshotController {
  constructor(private readonly snapshotService: SnapshotService) {}

  /**
   * Get all user's snapshots
   */
  @Get()
  async getUserSnapshots(@Req() req: Request): Promise<SnapshotResponseDto[]> {
    const user = req.user as User;

    return this.snapshotService.getUserSnapshots(user.id);
  }

  /**
   * Get specific snapshot with items and streamlined UI data
   */
  @Get(':id')
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
  async createSnapshot(
    @Req() req: Request,
  ): Promise<CreateSnapshotResponseDto> {
    const user = req.user as User;
    return this.snapshotService.createSnapshot(user);
  }
}
