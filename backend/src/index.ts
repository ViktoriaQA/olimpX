// Load environment variables FIRST
import dotenv from 'dotenv';
import path from 'path';

// Determine environment and load appropriate .env file
const env = process.env.NODE_ENV || 'development';
console.log('CWD:', process.cwd());
console.log('NODE_ENV:', env);

// In Docker, .env file is in the root directory
const envPath = process.env.NODE_ENV === 'production' 
  ? path.resolve('/app/.env')
  : path.resolve(__dirname, '../.env');

console.log('Loading .env from:', envPath);

// Check if .env file exists before loading
if (require('fs').existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ .env file loaded successfully');
} else {
  console.log('⚠️ .env file not found, using environment variables only');
  dotenv.config(); // Fallback to default behavior
}

// Verify critical environment variables are loaded
const requiredEnvVars = ['LIQPAY_PUBLIC_KEY', 'LIQPAY_PRIVATE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('LIQPAY')));
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

// Then load the server
import app from './server';

export default app;