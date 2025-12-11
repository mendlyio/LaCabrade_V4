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

// Link node_modules from parent (MUCH faster than npm install)
console.log('Linking node_modules to .medusa/server...');
const parentNodeModules = path.join(process.cwd(), 'node_modules');
const serverNodeModules = path.join(MEDUSA_SERVER_PATH, 'node_modules');

try {
  // Remove existing node_modules in server if any
  if (fs.existsSync(serverNodeModules)) {
    fs.rmSync(serverNodeModules, { recursive: true, force: true });
  }
  
  // Create symlink to parent's node_modules (instant, no download needed)
  fs.symlinkSync(parentNodeModules, serverNodeModules, 'dir');
  console.log('✅ node_modules linked successfully (symlink)');
} catch (symlinkError) {
  console.log('Symlink failed, trying copy instead...');
  try {
    // Fallback: copy node_modules (slower but works on all systems)
    execSync(`cp -r "${parentNodeModules}" "${serverNodeModules}"`, { 
      stdio: 'inherit',
      timeout: 300000 // 5 minutes max
    });
    console.log('✅ node_modules copied successfully');
  } catch (copyError) {
    console.error('⚠️ Warning: Could not link/copy node_modules:', copyError.message);
    // Don't throw - try to continue anyway
  }
}
