const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const MEDUSA_SERVER_PATH = path.join(process.cwd(), '.medusa', 'server');

// Check if .medusa/server exists - if not, build process failed
if (!fs.existsSync(MEDUSA_SERVER_PATH)) {
  throw new Error('.medusa/server directory not found. This indicates the Medusa build process failed. Please check for build errors.');
}

// Copy pnpm-lock.yaml
fs.copyFileSync(
  path.join(process.cwd(), 'pnpm-lock.yaml'),
  path.join(MEDUSA_SERVER_PATH, 'pnpm-lock.yaml')
);

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
if (fs.existsSync(srcPath)) {
  // Create src directory if it doesn't exist
  if (!fs.existsSync(destSrcPath)) {
    fs.mkdirSync(destSrcPath, { recursive: true });
  }
  
  // Copy entire src directory
  execSync(`cp -r ${srcPath}/* ${destSrcPath}/`, { stdio: 'inherit' });
  console.log('✅ src directory copied successfully');
}

// Install dependencies
console.log('Installing dependencies in .medusa/server...');
execSync('pnpm i --prod --no-frozen-lockfile', { 
  cwd: MEDUSA_SERVER_PATH,
  stdio: 'inherit'
});
