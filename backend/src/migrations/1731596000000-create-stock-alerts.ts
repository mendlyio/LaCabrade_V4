import { Migration } from '@mikro-orm/migrations';

export class CreateStockAlerts1731596000000 extends Migration {
  async up(): Promise<void> {
    // Créer la table stock_alerts
    this.addSql(`
      CREATE TABLE IF NOT EXISTS stock_alerts (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        variant_id VARCHAR(255),
        customer_email VARCHAR(255) NOT NULL,
        customer_id VARCHAR(255),
        notified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );
    `);

    // Index pour recherche rapide
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_stock_alerts_product 
      ON stock_alerts(product_id, variant_id, notified);
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_stock_alerts_email 
      ON stock_alerts(customer_email);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS stock_alerts;`);
  }
}

