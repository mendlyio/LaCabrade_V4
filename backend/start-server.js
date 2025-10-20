#!/usr/bin/env node

/**
 * Script de démarrage robuste pour Medusa avec retry sur PostgreSQL
 * Gère les problèmes de connexion au démarrage sur Railway
 */

const { spawn } = require('child_process');
const { Client } = require('pg');

const MAX_RETRIES = 10;
const RETRY_DELAY = 5000; // 5 secondes

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

// Attendre que PostgreSQL soit prêt
async function waitForPostgres() {
  for (let i = 0; i < MAX_RETRIES; i++) {
    console.log(`⏳ Attempting to connect to PostgreSQL (attempt ${i + 1}/${MAX_RETRIES})...`);
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
    });
    
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log('✅ PostgreSQL is ready!');
      return true;
    } catch (error) {
      console.log(`⚠️  PostgreSQL not ready: ${error.message}`);
      await client.end().catch(() => {});
      
      if (i < MAX_RETRIES - 1) {
        console.log(`⏳ Waiting ${RETRY_DELAY / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  console.error(`❌ Failed to connect to PostgreSQL after ${MAX_RETRIES} attempts`);
  return false;
}

// Exécuter une commande avec retry
async function runCommandWithRetry(command, args, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    console.log(`🔧 Running: ${command} ${args.join(' ')} (attempt ${i + 1}/${retries})`);
    
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
          stdio: 'inherit',
          shell: true,
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
  
  // Étape 1 : Vérifier les variables d'environnement
  checkEnvironment();
  
  // Étape 2 : Attendre PostgreSQL
  const postgresReady = await waitForPostgres();
  if (!postgresReady) {
    console.error('❌ Cannot start backend without database connection');
    process.exit(1);
  }
  
  // Étape 3 : Initialiser le backend
  console.log('\n🔧 Initializing backend...');
  const initSuccess = await runCommandWithRetry('init-backend', [], 3);
  if (!initSuccess) {
    console.error('❌ Backend initialization failed');
    process.exit(1);
  }
  
  // Étape 4 : Démarrer le serveur
  console.log('\n🚀 Starting Medusa server...');
  const proc = spawn('medusa', ['start', '--verbose'], {
    stdio: 'inherit',
    shell: true,
    cwd: '.medusa/server',
  });
  
  proc.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
  
  proc.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
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

