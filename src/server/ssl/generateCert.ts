import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createServer } from 'node:https';

const DATA_DIR = process.env.DATA_DIR || './data';
const CERT_PATH = process.env.CERT_PATH;

export function generateSelfSignedCert() {
  // Skip if user provided their own cert
  if (CERT_PATH && existsSync(CERT_PATH + '/cert.pem')) {
    console.log('🔒 Using user-provided certificate from:', CERT_PATH);
    return { cert: CERT_PATH + '/cert.pem', key: CERT_PATH + '/key.pem' };
  }

  // Skip if auto-generation is disabled
  if (process.env.ENABLE_AUTO_CERT === 'false') {
    console.log('🔒 Auto-cert generation disabled via ENABLE_AUTO_CERT=false');
    return null;
  }

  // Check if certs already exist
  const certPath = join(DATA_DIR, 'cert.pem');
  const keyPath = join(DATA_DIR, 'key.pem');

  if (existsSync(certPath) && existsSync(keyPath)) {
    console.log('🔒 Certificate already exists, reusing existing files');
    return { cert: certPath, key: keyPath };
  }

  // Ensure data directory exists
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  console.log('🔒 Generating self-signed SSL certificate...');
  const certs = createServer({
    cert: certPath,
    key: keyPath,
  }).getCertificate();

  writeFileSync(certPath, certs.cert);
  writeFileSync(keyPath, certs.private);

  console.log(`✅ Certificate generated: ${certPath}`);
  console.log(`✅ Private key generated: ${keyPath}`);

  return { cert: certPath, key: keyPath };
}

export function getCertPaths() {
  const CERT_PATH = process.env.CERT_PATH;
  if (CERT_PATH) {
    return { cert: cert: CERT_PATH + '/cert.pem', key: CERT_PATH + '/key.pem' };
  }

  const certPath = join(DATA_DIR, 'cert.pem');
  const keyPath = join(DATA_DIR, 'key.pem');

  if (existsSync(certPath) && existsSync(keyPath)) {
    return { cert: certPath, key: keyPath };
  }

  return null;
}
