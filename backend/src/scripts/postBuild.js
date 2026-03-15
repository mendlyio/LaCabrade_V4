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
// Ces dossiers sont déjà compilés par medusa build vers .medusa/server/src/
// Les copier en TS par-dessus causerait un double chargement → erreur MikroORM
// "Duplicate entity names are not allowed"
const EXCLUDED_DIRS = ['subscribers', 'loaders', 'api', 'workflows', 'jobs', 'admin', 'types', 'utils', 'modules'];

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

// Link or copy node_modules - sur Railway/Docker, la copie est plus fiable que le symlink
console.log('Setting up node_modules for .medusa/server...');
const parentNodeModules = path.join(process.cwd(), 'node_modules');
const serverNodeModules = path.join(MEDUSA_SERVER_PATH, 'node_modules');
const forceCopy = process.env.FORCE_COPY_NODE_MODULES || process.env.NIXPACKS || process.env.CI;

function copyNodeModules() {
  if (!fs.existsSync(parentNodeModules)) {
    throw new Error('node_modules not found in project root');
  }
  if (fs.existsSync(serverNodeModules)) {
    fs.rmSync(serverNodeModules, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(serverNodeModules), { recursive: true });
  fs.cpSync(parentNodeModules, serverNodeModules, { recursive: true });
  console.log('✅ node_modules copied successfully');
}

if (forceCopy) {
  console.log('Using copy (Nixpacks/CI/Railway detected)...');
  copyNodeModules();
} else {
  try {
    if (fs.existsSync(serverNodeModules)) {
      fs.rmSync(serverNodeModules, { recursive: true, force: true });
    }
    fs.symlinkSync(parentNodeModules, serverNodeModules, 'dir');
    console.log('✅ node_modules linked successfully (symlink)');
  } catch (symlinkError) {
    console.log('Symlink failed, copying instead...');
    try {
      copyNodeModules();
    } catch (copyError) {
      try {
        execSync(`cp -r "${parentNodeModules}" "${serverNodeModules}"`, {
          stdio: 'inherit',
          timeout: 300000,
        });
        console.log('✅ node_modules copied via cp');
      } catch (execError) {
        console.error('❌ Failed to link/copy node_modules:', execError.message);
        throw new Error('postBuild: node_modules setup failed.');
      }
    }
  }
}
