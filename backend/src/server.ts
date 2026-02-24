// Environment variables are already loaded in index.ts
// No need to load them again here

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import subscriptionRoutes from './routes/subscriptions';
import tournamentRoutes from './routes/tournaments';
import taskRoutes from './routes/tasks';
import paymentRoutes from './routes/payment';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://googletagmanager.com", "https://accounts.google.com", "https://static.cloudflareinsights.com", "https://static.liqpay.ua", "https://www.google-analytics.com"],
      connectSrc: ["'self'", "ws://localhost:8080", "wss://olimpxx.pp.ua:8080", "https://accounts.google.com", "https://olimpx-production.up.railway.app", "https://olimpx-production.up.railway.app", "https://www.google-analytics.com", "http://localhost:3001"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
app.use(cors({
  origin: [
    ...(process.env.FRONTEND_URL?.split(',') || []),
    ...(process.env.PRODUCTION_FRONTEND_URL?.split(',') || []),
    'http://localhost:5173', 
    'http://localhost:5174',
    'http://172.23.0.1:5173',
    'http://127.0.0.1:5173',
    'https://olimpxx.pp.ua'
  ].filter(Boolean),
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  const staticPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../static')
    : path.join(__dirname, '../../frontend/dist');
  const frontendReady = require('fs').existsSync(staticPath);
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    frontend: frontendReady ? 'ready' : 'building',
    static_path: staticPath
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/tournaments', authMiddleware, tournamentRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/v1/payment', paymentRoutes);

// Direct LiqPay callback route (without /api/v1 prefix)
app.use('/payment', paymentRoutes);

// Serve static files from frontend build
const staticPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../static')  // In Docker: /app/static
  : path.join(__dirname, '../../frontend/dist'); // In development
console.log('Serving static files from:', staticPath);
app.use(express.static(staticPath));

// Catch all handler for SPA (must be after API routes)
app.get('*', (req, res) => {
  const indexPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../static/index.html')  // In Docker: /app/static/index.html
    : path.join(__dirname, '../../frontend/dist/index.html'); // In development
  res.sendFile(indexPath);
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 CodeArena Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;