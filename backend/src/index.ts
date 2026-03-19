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
const requiredEnvVars: string[] = [];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

// Log vConsole configuration
const vConsoleEnabled = process.env.VITE_ENABLE_VCONSOLE === 'true';
console.log('🔧 vConsole Configuration:', {
  VITE_ENABLE_VCONSOLE: process.env.VITE_ENABLE_VCONSOLE,
  enabled: vConsoleEnabled,
  environment: process.env.NODE_ENV
});

// Then load the server
import app from './server';

export default app;