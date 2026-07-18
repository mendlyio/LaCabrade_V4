#!/usr/bin/env node

/**
 * Script de démarrage robuste pour Medusa avec retry sur PostgreSQL
 * Gère les problèmes de connexion au démarrage sur Railway
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { Client } = require('pg');

const MAX_RETRIES = 15;
const RETRY_DELAY = 5000; // 5 secondes
// Sur Railway, Postgres est souvent déjà prêt - réduire l'attente initiale
const POSTGRES_INITIAL_WAIT = process.env.RAILWAY_HEALTHCHECK_TIMEOUT_SEC ? 3000 : 10000;

// S'assurer que node_modules/.bin est dans le PATH (critique pour Docker/Railway)
function ensurePath() {
  const cwd = process.cwd();
  const binPath = path.join(cwd, 'node_modules', '.bin');
  if (fs.existsSync(binPath)) {
    process.env.PATH = `${binPath}:${process.env.PATH || ''}`;
    console.log('   PATH includes node_modules/.bin');
  }
}

// Vérifier les variables d'environnement critiques
function checkEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'COOKIE_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ ERROR: Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
}

/**
 * Ajustements manuels de soldes bons cadeaux (magasin / support).
 * Idempotent : ne fait rien si le solde est déjà à la valeur cible.
 */
async function applyPendingGiftCardBalanceFixes(client) {
  const fixes = [
    {
      code: 'LC-GPSK-FLQQ-CHY5',
      email: 'charlotte-12@hotmail.fr',
      balance: 29.27,
      reason: 'Partie dépensée en magasin — solde restant 29,27€',
    },
  ]

  for (const fix of fixes) {
    try {
      const { rows } = await client.query(
        `SELECT id, balance, promotion_id, status
         FROM gift_card_tracking
         WHERE code = $1
           AND lower(recipient_email) = lower($2)
           AND deleted_at IS NULL
         LIMIT 1`,
        [fix.code, fix.email]
      )

      if (!rows.length) {
        console.log(`[GiftCard Fix] ${fix.code}: introuvable, skip`)
        continue
      }

      const gc = rows[0]
      const current = Number(gc.balance)
      if (Math.abs(current - fix.balance) < 0.005 && gc.status === 'active') {
        console.log(`[GiftCard Fix] ${fix.code}: déjà à ${fix.balance}€`)
        continue
      }

      const rawBalance = JSON.stringify({
        value: String(fix.balance),
        precision: 20,
      })
      const newStatus = fix.balance <= 0 ? 'depleted' : 'active'

      await client.query(
        `UPDATE gift_card_tracking
         SET balance = $1,
             raw_balance = $2::jsonb,
             status = $3,
             updated_at = now()
         WHERE id = $4`,
        [fix.balance, rawBalance, newStatus, gc.id]
      )

      if (gc.promotion_id) {
        try {
          await client.query(
            `UPDATE promotion_application_method
             SET value = $1,
                 raw_value = $2::jsonb
             WHERE promotion_id = $3`,
            [fix.balance, rawBalance, gc.promotion_id]
          )
          if (newStatus === 'active') {
            await client.query(
              `UPDATE promotion SET status = 'active', updated_at = now() WHERE id = $1`,
              [gc.promotion_id]
            )
          }
        } catch (promoErr) {
          console.log(
            `[GiftCard Fix] ${fix.code}: tracking OK, promo non mise à jour (${promoErr.message})`
          )
        }
      }

      console.log(
        `[GiftCard Fix] ✅ ${fix.code}: ${current}€ → ${fix.balance}€ (${fix.reason})`
      )
    } catch (err) {
      console.log(`[GiftCard Fix] ⚠️ ${fix.code}: ${err.message}`)
    }
  }
}

// Attendre que PostgreSQL soit prêt
async function waitForPostgres() {
  // Attente initiale pour laisser PostgreSQL démarrer complètement
  console.log(`⏳ Waiting ${POSTGRES_INITIAL_WAIT / 1000}s for PostgreSQL to start...`);
  await new Promise(resolve => setTimeout(resolve, POSTGRES_INITIAL_WAIT));
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    console.log(`⏳ Attempting to connect to PostgreSQL (attempt ${i + 1}/${MAX_RETRIES})...`);
    console.log(`   Database host: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'}`);
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
    
    try {
      await client.connect();
      console.log('   ✓ Connected to PostgreSQL');
      await client.query('SELECT 1');
      console.log('   ✓ Query test successful');
      // One-shot ops: ajustement soldes bons cadeaux (idempotent)
      await applyPendingGiftCardBalanceFixes(client);
      await client.end();
      console.log('✅ PostgreSQL is ready!');
      return true;
    } catch (error) {
      console.log(`⚠️  PostgreSQL not ready: ${error.code || error.message}`);
      console.log(`   Error details: ${error.errno}, ${error.syscall}`);
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (i < MAX_RETRIES - 1) {
        console.log(`⏳ Waiting ${RETRY_DELAY / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  console.error(`❌ Failed to connect to PostgreSQL after ${MAX_RETRIES} attempts`);
  console.error(`   Last DATABASE_URL host: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'not set'}`);
  return false;
}

// Exécuter une commande avec retry (utilise npx pour init-backend)
async function runCommandWithRetry(command, args, retries = MAX_RETRIES) {
  const cmd = command === 'init-backend' ? 'npx' : command;
  const cmdArgs = command === 'init-backend' ? ['init-backend'] : args;
  
  for (let i = 0; i < retries; i++) {
    console.log(`🔧 Running: ${cmd} ${cmdArgs.join(' ')} (attempt ${i + 1}/${retries})`);
    
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn(cmd, cmdArgs, {
          stdio: 'inherit',
          shell: true,
          env: process.env,
        });
        
        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Process exited with code ${code}`));
          }
        });
        
        proc.on('error', reject);
      });
      
      console.log('✅ Command completed successfully');
      return true;
    } catch (error) {
      console.log(`⚠️  Command failed: ${error.message}`);
      
      if (i < retries - 1) {
        console.log(`⏳ Waiting ${RETRY_DELAY / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  console.error(`❌ Command failed after ${retries} attempts`);
  return false;
}

// Fonction principale
async function main() {
  console.log('🚀 Starting Medusa backend with retry mechanism...\n');
  console.log(`   Node version: ${process.version}`);
  console.log(`   Working directory: ${process.cwd()}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'not set'}\n`);
  
  ensurePath();
  
  // Étape 1 : Vérifier les variables d'environnement
  checkEnvironment();
  
  // Étape 2 : Attendre PostgreSQL
  const postgresReady = await waitForPostgres();
  if (!postgresReady) {
    console.error('\n❌ Cannot start backend without database connection');
    console.error('   Please ensure:');
    console.error('   1. PostgreSQL service is running on Railway');
    console.error('   2. DATABASE_URL is correctly configured');
    console.error('   3. The database is accessible from this service');
    process.exit(1);
  }
  
  // Étape 3 : Initialiser le backend
  console.log('\n🔧 Initializing backend (migrations, seeds, admin)...');
  const initSuccess = await runCommandWithRetry('init-backend', [], 5);
  if (!initSuccess) {
    console.error('\n❌ Backend initialization failed after multiple attempts');
    console.error('   This could be due to:');
    console.error('   1. Database connection instability');
    console.error('   2. Migration conflicts');
    console.error('   3. Insufficient permissions');
    process.exit(1);
  }
  
  // Étape 4 : Démarrer le serveur
  console.log('\n🚀 Starting Medusa server...');
  console.log('   Server will be available on port 9000');
  
  // Augmenter la limite de mémoire Node.js pour éviter les erreurs "heap out of memory"
  const nodeOptions = process.env.NODE_OPTIONS || '';
  const memoryLimit = process.env.NODE_MAX_OLD_SPACE_SIZE || '2048';
  if (!nodeOptions.includes('--max-old-space-size')) {
    process.env.NODE_OPTIONS = `${nodeOptions} --max-old-space-size=${memoryLimit}`.trim();
    console.log(`   Node memory limit: ${memoryLimit} MB`);
  }
  
  const medusaServerPath = path.join(process.cwd(), '.medusa', 'server');
  if (!fs.existsSync(medusaServerPath)) {
    console.error('❌ .medusa/server not found. Build may have failed.');
    process.exit(1);
  }
  
  const proc = spawn('npx', ['medusa', 'start', '--verbose'], {
    stdio: 'inherit',
    shell: true,
    cwd: medusaServerPath,
    env: process.env,
  });
  
  proc.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
  
  proc.on('close', (code) => {
    console.log(`\nServer process exited with code ${code}`);
    process.exit(code || 0);
  });
  
  // Garder le processus parent vivant
  process.stdin.resume();
}

// Gestion des signaux pour arrêt propre
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Lancer le script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

