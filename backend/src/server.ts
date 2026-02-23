// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

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
app.use(helmet());
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
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  const frontendReady = require('fs').existsSync(frontendPath);
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    frontend: frontendReady ? 'ready' : 'building'
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
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Catch all handler for SPA (must be after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
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