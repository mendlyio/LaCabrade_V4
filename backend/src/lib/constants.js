const { loadEnv } = require('@medusajs/utils')

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

function assertValue(value, message) {
  if (value === undefined || value === null || value === '') {
    throw new Error(message)
  }
  return value
}

module.exports = {
  IS_DEV: process.env.NODE_ENV === 'development',
  BACKEND_URL: process.env.BACKEND_PUBLIC_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN_VALUE ?? 'http://localhost:9000',
  DATABASE_URL: assertValue(process.env.DATABASE_URL, 'Environment variable for DATABASE_URL is not set'),
  REDIS_URL: process.env.REDIS_URL,
  ADMIN_CORS: process.env.ADMIN_CORS,
  AUTH_CORS: process.env.AUTH_CORS,
  STORE_CORS: process.env.STORE_CORS,
  JWT_SECRET: assertValue(process.env.JWT_SECRET, 'Environment variable for JWT_SECRET is not set'),
  COOKIE_SECRET: assertValue(process.env.COOKIE_SECRET, 'Environment variable for COOKIE_SECRET is not set'),
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
  MINIO_BUCKET: process.env.MINIO_BUCKET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || 'contact@sellerie-lacabrade.be',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM,
  STRIPE_API_KEY: process.env.STRIPE_API_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  MEILISEARCH_HOST: process.env.MEILISEARCH_HOST,
  MEILISEARCH_ADMIN_KEY: process.env.MEILISEARCH_ADMIN_KEY,
  ODOO_URL: process.env.ODOO_URL,
  ODOO_DB_NAME: process.env.ODOO_DB_NAME,
  ODOO_USERNAME: process.env.ODOO_USERNAME,
  ODOO_API_KEY: process.env.ODOO_API_KEY,
  BPOST_PUBLIC_KEY: process.env.BPOST_PUBLIC_KEY,
  BPOST_PRIVATE_KEY: process.env.BPOST_PRIVATE_KEY,
  BPOST_WEBHOOK_SECRET: process.env.BPOST_WEBHOOK_SECRET,
  STORE_URL: process.env.STORE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.BPOST_SHOP_URL || 'https://www.sellerie-lacabrade.be',
  WORKER_MODE: process.env.MEDUSA_WORKER_MODE ?? 'shared',
  SHOULD_DISABLE_ADMIN: process.env.MEDUSA_DISABLE_ADMIN === 'true',
}
