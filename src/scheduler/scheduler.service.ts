import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { User, DailySummary, Snapshot } from '../entities';

import { SnapshotService } from '../snapshot/snapshot.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DailySummary)
    private dailySummaryRepository: Repository<DailySummary>,
    @InjectRepository(Snapshot)
    private snapshotRepository: Repository<Snapshot>,
    private snapshotService: SnapshotService, // Add SnapshotService
  ) {}

  /**
   * Create daily snapshots for all active users
   * Runs every day at 8 AM (UTC)
   */
  @Cron('0 8 * * *', { timeZone: 'UTC' }) // Daily at 8 AM UTC
  async createDailySnapshots() {
    this.logger.log('Starting daily snapshot creation for all users');

    const users = await this.userRepository.find({
      where: { isActive: true },
    });

    const activeUsers = users.filter((user) => user.gmailRefreshToken);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const user of activeUsers) {
      try {
        const result = await this.snapshotService.createSnapshot(user);

        if (result.success) {
          successCount++;
          this.logger.log(
            `✅ Created snapshot for ${user.email}: ${result.snapshot?.totalItems} items`,
          );
        } else {
          skipCount++;
          this.logger.log(`⏭️ Skipped ${user.email}: ${result.message}`);
        }
      } catch (error) {
        errorCount++;
        this.logger.error(
          `❌ Error creating snapshot for user ${user.email}:`,
          (error as Error).message,
        );
      }
    }

    this.logger.log(
      `📊 Daily snapshot creation completed - Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`,
    );
  }

  /**
   * Clean up expired snapshots (72-hour retention policy)
   * Runs every 4 hours to ensure timely cleanup
   */
  // TODO: Adjust frequency as needed based on user base and data volume
  @Cron('* */10 * * *') // Every 10 hours
  async cleanupExpiredSnapshots() {
    this.logger.log('🔴 🔂 Starting expired snapshots cleanup');

    try {
      // ------------------------------------------------------------------
      // PRODUCTION LOGIC (keep commented here for reference):
      // This is the intended production cleanup logic which deletes snapshots
      // after their `retentionExpiresAt` timestamp (72-hour retention).
      // We keep it commented so it remains in the file for easy reference.
      // ------------------------------------------------------------------
      // // Find expired snapshots
      // const now = new Date();
      // const expiredSnapshots = await this.snapshotRepository.find({
      //   where: {
      //     retentionExpiresAt: LessThan(now),
      //   },
      //   select: ['id', 'userId', 'totalItems', 'retentionExpiresAt'],
      // });
      //
      // if (expiredSnapshots.length === 0) {
      //   this.logger.log('📢 No expired snapshots found');
      //   return;
      // }
      //
      // // Hard delete expired snapshots (CASCADE will delete snapshot items)
      // const deletedCount = await this.snapshotRepository.delete({
      //   retentionExpiresAt: LessThan(now),
      // });
      //
      // this.logger.log(
      //   `🗑️ Deleted ${deletedCount.affected} expired snapshots (Privacy compliance: 72h retention)`,
      // );
      //
      // // Log details for monitoring
      // expiredSnapshots.forEach((snapshot) => {
      //   this.logger.debug(
      //     `Deleted snapshot ${snapshot.id} (${snapshot.totalItems} items) - expired: ${snapshot.retentionExpiresAt.toString()}`,
      //   );
      // });

      // ------------------------------------------------------------------
      // TESTING LOGIC: temporarily delete snapshots created more than 1 hour ago
      // TODO: Revert to retentionExpiresAt-based deletion for production.
      // This testing window lets us validate cleanup behavior without waiting
      // 72 hours. Remove/adjust before deploying to production.
      // ------------------------------------------------------------------
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

      // Find snapshots older than 1 hour (for testing)
      const expiredSnapshots = await this.snapshotRepository.find({
        where: {
          createdAt: LessThan(oneHourAgo),
        },
        select: ['id', 'userId', 'totalItems', 'createdAt'],
      });

      if (expiredSnapshots.length === 0) {
        this.logger.log('📢 No test-expired snapshots found (1h window)');
        return;
      }

      // Hard delete test-expired snapshots with manual cascade handling
      // TypeORM's remove() still generates raw DELETE that doesn't respect cascade
      // Use manual approach: delete snapshot_items first, then snapshots
      const snapshotsToDelete = await this.snapshotRepository.find({
        where: { createdAt: LessThan(oneHourAgo) },
        select: ['id'], // Only need IDs for deletion
      });

      if (snapshotsToDelete.length > 0) {
        const snapshotIds = snapshotsToDelete.map((s) => s.id);

        // Step 1: Delete all snapshot items for these snapshots
        await this.snapshotRepository.query(
          'DELETE FROM snapshot_items WHERE snapshot_id = ANY($1)',
          [snapshotIds],
        );

        // Step 2: Delete the snapshots themselves
        const deletedSnapshotsResult = await this.snapshotRepository.delete({
          id: In(snapshotIds),
        });

        this.logger.log(
          `🗑️ Deleted ${deletedSnapshotsResult.affected} test-expired snapshots (created >1h ago)`,
        );
        this.logger.debug(
          `Also deleted related snapshot items for proper cleanup`,
        );
      } else {
        this.logger.log(
          '📢 No test-expired snapshots found to delete (1h window)',
        );
      }

      // Log details for monitoring
      expiredSnapshots.forEach((snapshot) => {
        this.logger.debug(
          `Deleted snapshot ${snapshot.id} (${snapshot.totalItems} items) - created: ${snapshot.createdAt.toString()}`,
        );
      });
    } catch (error) {
      this.logger.error(
        '❌ Error during snapshot cleanup:',
        (error as Error).message,
      );
    }
  }

  /**
   * Weekly cleanup of old daily summaries (optional)
   * Keep the legacy system for now
   */
  @Cron('0 2 * * 0', { timeZone: 'UTC' }) // Weekly on Sunday at 02:00 UTC
  async cleanupOldDailySummaries() {
    this.logger.log('Starting weekly cleanup of old daily summaries');

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const deletedSummaries = await this.dailySummaryRepository.delete({
        summaryDate: LessThan(thirtyDaysAgo),
      });

      this.logger.log(
        `🗑️ Deleted ${deletedSummaries.affected} old daily summaries (30+ days)`,
      );
    } catch (error) {
      this.logger.error(
        'Error during daily summaries cleanup:',
        (error as Error).message,
      );
    }
  }
}
