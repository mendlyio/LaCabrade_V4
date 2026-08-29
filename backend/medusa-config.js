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

// Préparation de l'URL Redis :
//  - Si on est sur le réseau privé Railway (.railway.internal), on ajoute
//    automatiquement ?family=0 pour autoriser le DNS dual-stack (IPv6 requis
//    par le DNS privé Railway).
//  - L'ancien "sanitizer" qui retirait l'auth a été désactivé : il ne sert
//    plus depuis que Railway a généralisé l'auth Redis.
const getRedisUrl = (url) => {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".railway.internal") && !u.searchParams.has("family")) {
      u.searchParams.set("family", "0");
      const finalUrl = u.toString();
      console.log(`[Redis] Connecting via private network: ${u.protocol}//${u.host}${u.pathname}${u.search}`);
      return finalUrl;
    }
  } catch (e) {
    // URL invalide, on laisse Medusa lever l'erreur
  }
  return url;
};

const redisUrlToUse = getRedisUrl(REDIS_URL);

// SSL Postgres :
//  - Le proxy public Railway (*.proxy.rlwy.net) ne fait passer que du TLS.
//  - Le réseau privé Railway (postgres.railway.internal) NE fait PAS de TLS
//    (la connexion est déjà interne, chiffrer brise la connexion).
const databaseUrlNeedsSsl = (() => {
  if (!DATABASE_URL) return false;
  try {
    const host = new URL(DATABASE_URL).hostname;
    if (host.endsWith(".railway.internal")) return false; // privé = pas de SSL
    return host.includes("rlwy.net") || host.includes("railway"); // proxy public
  } catch {
    return false;
  }
})();

const medusaConfig = {
  projectConfig: {
    databaseUrl: DATABASE_URL,
    databaseLogging: false,
    databaseDriverOptions: {
      connection: {
        // SSL uniquement nécessaire quand on passe par le proxy public Railway.
        // Sur le réseau privé (.railway.internal), Postgres n'écoute pas en TLS.
        ssl: databaseUrlNeedsSsl ? { rejectUnauthorized: false } : false,
        // Keepalive TCP : évite que les NAT/proxy coupent silencieusement les
        // connexions idle (cause des "Connection ended unexpectedly").
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
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
            id: 'bpost',
            options: {
              publicKey: BPOST_PUBLIC_KEY,
              privateKey: BPOST_PRIVATE_KEY,
              webhookSecret: BPOST_WEBHOOK_SECRET
            }
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
