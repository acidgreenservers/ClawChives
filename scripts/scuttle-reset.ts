import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get environment from arguments
const args = process.argv.slice(2);
const envArg = args.indexOf('--env');
const env = envArg !== -1 ? args[envArg + 1] : 'development';

const isProd = env === 'production';
const dataDirName = isProd ? 'data' : 'data-dev';
const DATA_DIR = path.join(__dirname, '..', dataDirName);
const DB_PATH = path.join(DATA_DIR, 'db.sqlite');

console.log(`\n[🦞 Scuttle] Initiating deep-sea reset sequence...`);
console.log(`[🦞 Scuttle] Targets: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} reef`);

if (fs.existsSync(DB_PATH)) {
  try {
    console.log(`[🦞 Scuttle] Scuttling ${DB_PATH}...`);
    fs.unlinkSync(DB_PATH);
    console.log(`[🦞 Scuttle] ✅ Database file has been molted.`);
  } catch (err: any) {
    console.error(`[🦞 Scuttle] ❌ Failed to scuttle database: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log(`[🦞 Scuttle] ℹ️ No database file found at ${DB_PATH}. Reef is already clean.`);
}

console.log(`[🦞 Scuttle] Reset complete. Restart the API to hatch a new database.\n`);
