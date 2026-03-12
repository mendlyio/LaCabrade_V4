import { loadEnv } from '@medusajs/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

function assertValue(value, message) {
  if (value === undefined || value === null || value === '') {
    throw new Error(message)
  }
  return value
}

export const IS_DEV = process.env.NODE_ENV === 'development'
export const BACKEND_URL = process.env.BACKEND_PUBLIC_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN_VALUE ?? 'http://localhost:9000'
export const DATABASE_URL = assertValue(process.env.DATABASE_URL, 'Environment variable for DATABASE_URL is not set')
export const REDIS_URL = process.env.REDIS_URL
export const ADMIN_CORS = process.env.ADMIN_CORS
export const AUTH_CORS = process.env.AUTH_CORS
export const STORE_CORS = process.env.STORE_CORS
export const JWT_SECRET = assertValue(process.env.JWT_SECRET, 'Environment variable for JWT_SECRET is not set')
export const COOKIE_SECRET = assertValue(process.env.COOKIE_SECRET, 'Environment variable for COOKIE_SECRET is not set')
export const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT
export const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY
export const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY
export const MINIO_BUCKET = process.env.MINIO_BUCKET
export const RESEND_API_KEY = process.env.RESEND_API_KEY
export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || 'contact@sellerie-lacabrade.be'
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
export const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM
export const STRIPE_API_KEY = process.env.STRIPE_API_KEY
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
export const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST
export const MEILISEARCH_ADMIN_KEY = process.env.MEILISEARCH_ADMIN_KEY
export const ODOO_URL = process.env.ODOO_URL
export const ODOO_DB_NAME = process.env.ODOO_DB_NAME
export const ODOO_USERNAME = process.env.ODOO_USERNAME
export const ODOO_API_KEY = process.env.ODOO_API_KEY
export const BPOST_PUBLIC_KEY = process.env.BPOST_PUBLIC_KEY
export const BPOST_PRIVATE_KEY = process.env.BPOST_PRIVATE_KEY
export const BPOST_WEBHOOK_SECRET = process.env.BPOST_WEBHOOK_SECRET
export const STORE_URL = process.env.STORE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.BPOST_SHOP_URL || 'https://www.sellerie-lacabrade.be'
export const WORKER_MODE = process.env.MEDUSA_WORKER_MODE ?? 'shared'
export const SHOULD_DISABLE_ADMIN = process.env.MEDUSA_DISABLE_ADMIN === 'true'
