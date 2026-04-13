import * as dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';

console.log('--- .env Diagnostics ---');
const envPath = './.env';
if (fs.existsSync(envPath)) {
  console.log('.env file exists.');
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('.env length:', content.length);
} else {
  console.log('.env file NOT FOUND.');
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.log('ERROR: FIREBASE_SERVICE_ACCOUNT is missing in process.env');
} else {
  console.log('FIREBASE_SERVICE_ACCOUNT found (length: ' + raw.length + ')');
  try {
    let sanitized = raw;
    if (sanitized && ((sanitized.startsWith("'") && sanitized.endsWith("'")) || (sanitized.startsWith('"') && sanitized.endsWith('"')))) {
      sanitized = sanitized.substring(1, sanitized.length - 1);
      console.log('Trimmed wrapping quotes.');
    }
    const parsed = JSON.parse(sanitized);
    console.log('SUCCESS: JSON parsed correctly. Project ID:', parsed.project_id);
  } catch (err) {
    console.log('ERROR: JSON parse failed:', err.message);
  }
}
