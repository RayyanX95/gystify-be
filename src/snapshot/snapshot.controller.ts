import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SnapshotService } from './snapshot.service';
import {
  CreateSnapshotResponseDto,
  SnapshotResponseDto,
  SnapshotWithItemsResponseDto,
} from './dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('snapshots')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class SnapshotController {
  constructor(private readonly snapshotService: SnapshotService) {}

  /**
   * Get all user's snapshots
   */
  @Get()
  async getUserSnapshots(@Request() req): Promise<SnapshotResponseDto[]> {
    return this.snapshotService.getUserSnapshots(req.user.userId);
  }

  /**
   * Get specific snapshot with items and streamlined UI data
   */
  @Get(':id')
  async getSnapshotWithItems(
    @Request() req,
    @Param('id') snapshotId: string,
  ): Promise<SnapshotWithItemsResponseDto> {
    return this.snapshotService.getSnapshotWithItems(
      req.user.userId,
      snapshotId,
    );
  }

  /**
   * Create new snapshot from unread emails
   */
  @Post()
  async createSnapshot(@Request() req): Promise<CreateSnapshotResponseDto> {
    return this.snapshotService.createSnapshot(req.user);
  }
}
