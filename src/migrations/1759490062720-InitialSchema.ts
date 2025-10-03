import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1759490062720 implements MigrationInterface {
  name = 'InitialSchema1759490062720';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types first
    await queryRunner.query(
      `CREATE TYPE "public"."users_subscription_tier_enum" AS ENUM('free', 'trial', 'starter', 'pro')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_billing_cycle_enum" AS ENUM('monthly', 'yearly')`,
    );

    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "google_id" character varying NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "profile_picture" character varying, "gmail_refresh_token" character varying, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "subscription_tier" "public"."users_subscription_tier_enum" NOT NULL DEFAULT 'free', "billing_cycle" "public"."users_billing_cycle_enum", "trial_started_at" TIMESTAMP, "trial_expires_at" TIMESTAMP, "subscription_started_at" TIMESTAMP, "subscription_expires_at" TIMESTAMP, "stripe_customer_id" character varying, "stripe_subscription_id" character varying, "snapshots_created_today" integer NOT NULL DEFAULT '0', "total_snapshots_created" integer NOT NULL DEFAULT '0', "emails_summarized_today" integer NOT NULL DEFAULT '0', "total_emails_summarized" integer NOT NULL DEFAULT '0', "last_snapshot_date" TIMESTAMP, "last_usage_reset_date" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_0bd5012aeb82628e07f6a1be53b" UNIQUE ("google_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "snapshots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "snapshot_date" date NOT NULL, "total_items" integer NOT NULL DEFAULT '0', "retention_expires_at" TIMESTAMP NOT NULL, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f5661b5fd4224d23e26a631986b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dc176ed233dc1af0e06dd08309" ON "snapshots" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b4a868662df44e5b9f8ca0de1b" ON "snapshots" ("snapshot_date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "senders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "sender_name" character varying(255) NOT NULL, "email_address" character varying(255) NOT NULL, "domain" character varying(255) NOT NULL, "total_emails" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6d8151a112d95fefbb1b20c34d3" UNIQUE ("user_id", "email_address"), CONSTRAINT "PK_398b8614004a406acf982651b46" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_76d8247f6243442e4762b9084e" ON "senders" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "snapshot_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "snapshot_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "provider" character varying(50) NOT NULL DEFAULT 'gmail', "message_id" character varying(255) NOT NULL, "subject" character varying(500) NOT NULL, "email_date" TIMESTAMP NOT NULL, "summary" text NOT NULL, "finish_reason" character varying(100), "snippet" character varying(1000), "is_ignored_from_snapshots" boolean NOT NULL DEFAULT false, "is_removed_from_inbox" boolean NOT NULL DEFAULT false, "open_url" character varying(1000), "attachments_meta" jsonb, "category_tags" jsonb, "priority_score" numeric(3,2), "priority_label" character varying(50), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7369a0aeb928f1ccb32f1e4d75b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_45143ad50e20fda86fca3c7b3a" ON "snapshot_items" ("snapshot_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5607e3b2ae42064aae2bf81be4" ON "snapshot_items" ("sender_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_interactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "snapshot_item_id" uuid NOT NULL, "action_type" character varying(50) NOT NULL, "action_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_173313ad3f40a2ae74b48f82dd7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8165cbaf68d8c40e80bda6468a" ON "user_interactions" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21336353aba764bb182d6f2ca2" ON "user_interactions" ("snapshot_item_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "daily_summaries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" text, "summary_date" date NOT NULL, "total_emails" integer NOT NULL, "ai_processing_time_ms" double precision, "important_emails" integer NOT NULL, "summary" text NOT NULL, "key_insights" text, "total_size_bytes" bigint, "avg_priority_score" numeric(3,2), "high_priority_emails" integer, "promotional_emails" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_2d7ed4d1fd3c764c045b6945c4a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "snapshots" ADD CONSTRAINT "FK_dc176ed233dc1af0e06dd08309b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "senders" ADD CONSTRAINT "FK_76d8247f6243442e4762b9084e9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "snapshot_items" ADD CONSTRAINT "FK_45143ad50e20fda86fca3c7b3ad" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "snapshot_items" ADD CONSTRAINT "FK_5607e3b2ae42064aae2bf81be48" FOREIGN KEY ("sender_id") REFERENCES "senders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interactions" ADD CONSTRAINT "FK_8165cbaf68d8c40e80bda6468a7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interactions" ADD CONSTRAINT "FK_21336353aba764bb182d6f2ca2c" FOREIGN KEY ("snapshot_item_id") REFERENCES "snapshot_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_summaries" ADD CONSTRAINT "FK_b8fe1bf443d817a306fbda45040" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "daily_summaries" DROP CONSTRAINT "FK_b8fe1bf443d817a306fbda45040"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interactions" DROP CONSTRAINT "FK_21336353aba764bb182d6f2ca2c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_interactions" DROP CONSTRAINT "FK_8165cbaf68d8c40e80bda6468a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "snapshot_items" DROP CONSTRAINT "FK_5607e3b2ae42064aae2bf81be48"`,
    );
    await queryRunner.query(
      `ALTER TABLE "snapshot_items" DROP CONSTRAINT "FK_45143ad50e20fda86fca3c7b3ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "senders" DROP CONSTRAINT "FK_76d8247f6243442e4762b9084e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "snapshots" DROP CONSTRAINT "FK_dc176ed233dc1af0e06dd08309b"`,
    );
    await queryRunner.query(`DROP TABLE "daily_summaries"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_21336353aba764bb182d6f2ca2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8165cbaf68d8c40e80bda6468a"`,
    );
    await queryRunner.query(`DROP TABLE "user_interactions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5607e3b2ae42064aae2bf81be4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_45143ad50e20fda86fca3c7b3a"`,
    );
    await queryRunner.query(`DROP TABLE "snapshot_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_76d8247f6243442e4762b9084e"`,
    );
    await queryRunner.query(`DROP TABLE "senders"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b4a868662df44e5b9f8ca0de1b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dc176ed233dc1af0e06dd08309"`,
    );
    await queryRunner.query(`DROP TABLE "snapshots"`);
    await queryRunner.query(`DROP TABLE "users"`);
    // Drop enum types last
    await queryRunner.query(`DROP TYPE "public"."users_billing_cycle_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."users_subscription_tier_enum"`,
    );
  }
}
