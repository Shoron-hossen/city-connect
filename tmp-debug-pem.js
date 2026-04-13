const dotenv = require('dotenv');
dotenv.config();
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
console.log('raw length', raw.length);
let candidate = raw.trim();
if ((candidate.startsWith("'") && candidate.endsWith("'")) || (candidate.startsWith('"') && candidate.endsWith('"'))) {
  candidate = candidate.slice(1, -1);
}
const sa = JSON.parse(candidate);
let pk = sa.private_key;
console.log('pk contains literal slashn', pk.includes('\\n'));
console.log('pk contains newline', pk.includes('\n'));
pk = pk.replace(/\\r/g, '').replace(/\\n/g, '\n').trim();
console.log('after normalize startswith', pk.startsWith('-----BEGIN PRIVATE KEY-----'));
console.log('after normalize endswith', pk.endsWith('-----END PRIVATE KEY-----'));
console.log('after normalize first 100:', JSON.stringify(pk.slice(0, 100)));
console.log('after normalize len', pk.length);
// try crypto createPrivateKey
const crypto = require('crypto');
try {
  const keyObj = crypto.createPrivateKey({ key: pk, format: 'pem', type: 'pkcs8' });
  console.log('crypto success:', keyObj.type, keyObj.asymmetricKeyType);
} catch (e) {
  console.error('crypto error:', e.message);
}
