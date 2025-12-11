const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const MEDUSA_SERVER_PATH = path.join(process.cwd(), '.medusa', 'server');

// Check if .medusa/server exists - if not, build process failed
if (!fs.existsSync(MEDUSA_SERVER_PATH)) {
  throw new Error('.medusa/server directory not found. This indicates the Medusa build process failed. Please check for build errors.');
}

// Copy package-lock.json
const packageLockPath = path.join(process.cwd(), 'package-lock.json');
if (fs.existsSync(packageLockPath)) {
  fs.copyFileSync(
    packageLockPath,
    path.join(MEDUSA_SERVER_PATH, 'package-lock.json')
  );
}

// Copy .env if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  fs.copyFileSync(
    envPath,
    path.join(MEDUSA_SERVER_PATH, '.env')
  );
}

// Copy src directory (needed for medusa-config.js imports)
console.log('Copying src directory to .medusa/server...');
const srcPath = path.join(process.cwd(), 'src');
const destSrcPath = path.join(MEDUSA_SERVER_PATH, 'src');

// Directories to exclude from copying (because they are already compiled to JS)
const EXCLUDED_DIRS = ['subscribers', 'loaders', 'api', 'workflows', 'jobs', 'admin', 'types', 'utils'];

function copyDirRecursive(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read all files and directories
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip .disabled files
    if (entry.name.endsWith('.disabled')) {
      console.log(`  Skipping: ${entry.name}`);
      continue;
    }

    // Skip excluded source directories to prevent duplicate loading (TS vs JS)
    if (EXCLUDED_DIRS.includes(entry.name)) {
        console.log(`  Skipping source directory: ${entry.name} (already compiled)`);
      continue;
    }

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(srcPath)) {
  copyDirRecursive(srcPath, destSrcPath);
  console.log('✅ src directory copied successfully (excluding .disabled files)');
}

// Install dependencies (optimized for Railway/CI)
console.log('Installing dependencies in .medusa/server...');
try {
  // Try npm ci first (faster with lockfile), fallback to npm install
  execSync('npm ci --omit=dev --prefer-offline --no-audit --no-fund 2>/dev/null || npm install --omit=dev --prefer-offline --no-audit --no-fund', { 
    cwd: MEDUSA_SERVER_PATH,
    stdio: 'inherit',
    timeout: 600000, // 10 minutes max
    env: {
      ...process.env,
      NPM_CONFIG_LOGLEVEL: 'error',
      NPM_CONFIG_FETCH_RETRIES: '3',
      NPM_CONFIG_FETCH_RETRY_MINTIMEOUT: '10000',
      NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: '60000',
    }
  });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('⚠️ Warning: npm install had issues but continuing...', error.message);
  // Don't throw - the server might still work with existing deps
}
