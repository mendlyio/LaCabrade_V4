import { Migration } from '@mikro-orm/migrations'

export class CreateNewsletterSubscribers1742000000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        birthday VARCHAR(5),
        promo_code VARCHAR(255),
        birthday_promo_code VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_email
      ON newsletter_subscribers(email);
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_birthday
      ON newsletter_subscribers(birthday)
      WHERE deleted_at IS NULL AND status = 'active';
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS newsletter_subscribers;`)
  }
}
