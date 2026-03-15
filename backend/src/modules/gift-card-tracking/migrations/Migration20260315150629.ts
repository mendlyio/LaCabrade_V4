import { Migration } from '@mikro-orm/migrations';

export class Migration20260315150629 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "gift_card_tracking" drop constraint if exists "gift_card_tracking_code_unique";`);
    this.addSql(`create table if not exists "gift_card_tracking" ("id" text not null, "code" text not null, "original_amount" numeric not null, "balance" numeric not null, "recipient_email" text not null, "recipient_name" text not null, "sender_name" text null, "message" text null, "order_id" text not null, "promotion_id" text null, "status" text check ("status" in ('active', 'depleted', 'disabled')) not null default 'active', "raw_original_amount" jsonb not null, "raw_balance" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "gift_card_tracking_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_gift_card_tracking_code_unique" ON "gift_card_tracking" (code) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_card_tracking_deleted_at" ON "gift_card_tracking" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "gift_card_tracking" cascade;`);
  }

}
