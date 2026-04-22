import { loadEnv, Modules, defineConfig } from '@medusajs/utils'
import * as constants from './src/lib/constants.js'

const {
  ADMIN_CORS,
  AUTH_CORS,
  BACKEND_URL,
  COOKIE_SECRET,
  DATABASE_URL,
  JWT_SECRET,
  REDIS_URL,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL,
  SHOULD_DISABLE_ADMIN,
  STORE_CORS,
  STRIPE_API_KEY,
  STRIPE_WEBHOOK_SECRET,
  WORKER_MODE,
  MINIO_ENDPOINT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET,
  MEILISEARCH_HOST,
  MEILISEARCH_ADMIN_KEY,
  ODOO_URL,
  ODOO_DB_NAME,
  ODOO_USERNAME,
  ODOO_API_KEY,
  BPOST_PUBLIC_KEY,
  BPOST_PRIVATE_KEY,
  BPOST_WEBHOOK_SECRET,
} = constants.default ?? constants

loadEnv(process.env.NODE_ENV, process.cwd());

// Fonction pour nettoyer l'URL Redis sur Railway si elle contient un mot de passe inutile
const getSanitizedRedisUrl = (url) => {
  if (!url) return undefined;
  // Sur Railway, si on a l'erreur AUTH failed alors que l'URL a un mot de passe,
  // c'est souvent que le Redis interne est en mode no-auth.
  if (url.includes('railway') && url.includes('@')) {
    try {
      // On parse l'URL pour retirer l'authentification
      // Exemple: redis://default:pass@host:port -> redis://host:port
      const urlObj = new URL(url);
      const sanitized = `${urlObj.protocol}//${urlObj.host}`;
      console.log(`[Redis] Using sanitized URL (removed auth): ${sanitized}`);
      return sanitized;
    } catch (e) {
      return url;
    }
  }
  return url;
};

// Utiliser l'URL nettoyée pour éviter l'erreur AUTH failed
const redisUrlToUse = getSanitizedRedisUrl(REDIS_URL);

const medusaConfig = {
  projectConfig: {
    databaseUrl: DATABASE_URL,
    databaseLogging: false,
    databaseDriverOptions: {
      connection: {
        // Activer SSL pour Railway (même en dev local)
        ssl: DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false,
      },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
      },
    },
    redisUrl: redisUrlToUse,
    workerMode: WORKER_MODE,
    http: {
      adminCors: ADMIN_CORS,
      authCors: AUTH_CORS,
      storeCors: STORE_CORS,
      jwtSecret: JWT_SECRET,
      cookieSecret: COOKIE_SECRET,
      jwtExpiresIn: "30d"
    },
    build: {
      rollupOptions: {
        external: ["@medusajs/dashboard", "@medusajs/ui"]
      }
    }
  },
  admin: {
    backendUrl: BACKEND_URL,
    disable: SHOULD_DISABLE_ADMIN,
  },
  modules: [
    {
      key: "stockAlert",
      resolve: "./src/modules/stock-alert",
    },
    {
      key: Modules.FILE,
      resolve: '@medusajs/file',
      options: {
        providers: [
          ...(MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY ? [{
            resolve: './src/modules/minio-file',
            id: 'minio',
            options: {
              endPoint: MINIO_ENDPOINT,
              accessKey: MINIO_ACCESS_KEY,
              secretKey: MINIO_SECRET_KEY,
              bucket: MINIO_BUCKET // Optional, default: medusa-media
            }
          }] : [{
            resolve: '@medusajs/file-local',
            id: 'local',
            options: {
              upload_dir: 'static',
              backend_url: `${BACKEND_URL}/static`
            }
          }])
        ]
      }
    },
    ...(redisUrlToUse ? [{
      key: Modules.EVENT_BUS,
      resolve: '@medusajs/event-bus-redis',
      options: {
        redisUrl: redisUrlToUse
      }
    },
    {
      key: Modules.WORKFLOW_ENGINE,
      resolve: '@medusajs/workflow-engine-redis',
      options: {
        redis: {
          url: redisUrlToUse,
        }
      }
    }] : []),
    ...(SENDGRID_API_KEY && SENDGRID_FROM_EMAIL || RESEND_API_KEY && RESEND_FROM_EMAIL ? [{
      key: Modules.NOTIFICATION,
      resolve: '@medusajs/notification',
      options: {
        providers: [
          ...(SENDGRID_API_KEY && SENDGRID_FROM_EMAIL ? [{
            resolve: '@medusajs/notification-sendgrid',
            id: 'sendgrid',
            options: {
              channels: ['email'],
              api_key: SENDGRID_API_KEY,
              from: SENDGRID_FROM_EMAIL,
            }
          }] : []),
          ...(RESEND_API_KEY && RESEND_FROM_EMAIL ? [{
            resolve: './src/modules/email-notifications',
            id: 'resend',
            options: {
              channels: ['email'],
              api_key: RESEND_API_KEY,
              from: RESEND_FROM_EMAIL,
            },
          }] : []),
        ]
      }
    }] : []),
    ...(STRIPE_API_KEY ? [{
      key: Modules.PAYMENT,
      resolve: '@medusajs/payment',
      options: {
        providers: [
          {
            resolve: '@medusajs/payment-stripe',
            id: 'stripe',
            options: {
              apiKey: STRIPE_API_KEY,
              ...(STRIPE_WEBHOOK_SECRET ? { webhookSecret: STRIPE_WEBHOOK_SECRET } : {}),
              automaticPaymentMethods: true,
              capture: true, // Bancontact/Klarna/Alma exigent capture automatique
            },
          },
        ],
      },
    }] : []),
    ...(ODOO_URL && ODOO_DB_NAME && ODOO_USERNAME && ODOO_API_KEY ? [{
      key: 'odoo',
      resolve: './src/modules/odoo',
      options: {
        url: ODOO_URL,
        dbName: ODOO_DB_NAME,
        username: ODOO_USERNAME,
        apiKey: ODOO_API_KEY
      }
    }] : []),
    ...((BPOST_PUBLIC_KEY && BPOST_PRIVATE_KEY) ? [{
      key: 'bpost',
      resolve: './src/modules/bpost',
      options: {
        publicKey: BPOST_PUBLIC_KEY,
        privateKey: BPOST_PRIVATE_KEY,
        webhookSecret: BPOST_WEBHOOK_SECRET
      }
    }] : []),
    {
      key: "gift_card_tracking",
      resolve: "./src/modules/gift-card-tracking",
    },
    {
      key: "newsletter",
      resolve: "./src/modules/newsletter",
    },
    {
      key: Modules.FULFILLMENT,
      resolve: '@medusajs/fulfillment',
      options: {
        providers: [
          ...((BPOST_PUBLIC_KEY && BPOST_PRIVATE_KEY) ? [{
            resolve: './src/modules/bpost-fulfillment',
            id: 'bpost'
          }] : []),
          {
            resolve: '@medusajs/fulfillment-manual',
            id: 'manual'
          }
        ]
      }
    }
  ],
  plugins: [
  ...(MEILISEARCH_HOST && MEILISEARCH_ADMIN_KEY ? [{
      resolve: '@rokmohar/medusa-plugin-meilisearch',
      options: {
        config: {
          host: MEILISEARCH_HOST,
          apiKey: MEILISEARCH_ADMIN_KEY
        },
        settings: {
          products: {
            type: 'products',
            enabled: true,
            fields: ['id', 'title', 'description', 'handle', 'variant_sku', 'thumbnail'],
            indexSettings: {
              // Ne pas inclure 'description' : elle provoque des faux positifs
              // (ex: "gants" matche "À utiliser avec des gants" dans des produits non pertinents)
              searchableAttributes: ['title', 'handle', 'variant_sku'],
              displayedAttributes: ['id', 'handle', 'title', 'description', 'variant_sku', 'thumbnail'],
              filterableAttributes: ['id', 'handle'],
              typoTolerance: {
                enabled: true,
                minWordSizeForTypos: {
                  oneTypo: 4,
                  twoTypos: 8
                }
              }
            },
            primaryKey: 'id',
          }
        }
      }
    }] : [])
  ]
};

console.log(JSON.stringify(medusaConfig, null, 2));
export default defineConfig(medusaConfig);
