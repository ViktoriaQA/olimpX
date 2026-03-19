// Environment variables are already loaded in index.ts
// No need to load them again here

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { swaggerSpec, swaggerUi } from './config/swagger';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import userSwaggerRoutes from './routes/users-swagger';
import subscriptionRoutes from './routes/subscriptions';
import subscriptionSwaggerRoutes from './routes/subscriptions-swagger';
import tournamentRoutes from './routes/tournaments';
import tournamentSwaggerRoutes from './routes/tournaments-swagger';
import taskRoutes from './routes/tasks';
import taskSwaggerRoutes from './routes/tasks-swagger';
import studentRoutes from './routes/students';
import paymentRoutes from './routes/payment';
import paymentSwaggerRoutes from './routes/payment-swagger';
import codeExecutionRoutes from './routes/codeExecutionRoutes';
import logRoutes from './routes/logs';
import testSwaggerRoutes from './routes/test-swagger';
import adminRoutes from './routes/admin';
import { cronService } from './services/cronService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://googletagmanager.com", "https://accounts.google.com", "https://static.cloudflareinsights.com", "https://www.google-analytics.com", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "ws://localhost:8080", "wss://olimpxx.pp.ua:8080", "https://accounts.google.com", "https://olimpx-production.up.railway.app", "https://olimpxx-production.up.railway.app", "https://www.google-analytics.com", "http://localhost:3001"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
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

// Special CORS handling for Swagger documentation
app.use('/api-docs*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  const staticPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../static')
    : path.join(__dirname, '../../frontend/dist');
  const frontendReady = require('fs').existsSync(staticPath);
  
  // Log vConsole status
  const vConsoleEnabled = process.env.VITE_ENABLE_VCONSOLE === 'true';
  console.log('🔍 vConsole Status Check:', {
    VITE_ENABLE_VCONSOLE: process.env.VITE_ENABLE_VCONSOLE,
    vConsoleEnabled,
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    frontend: frontendReady ? 'ready' : 'building',
    static_path: staticPath,
    vconsole: {
      enabled: vConsoleEnabled,
      env_value: process.env.VITE_ENABLE_VCONSOLE
    }
  });
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CodeArena API Documentation',
  customfavIcon: '/favicon.png',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
    requestInterceptor: (req: any) => {
      // Add any custom headers if needed
      return req;
    },
    responseInterceptor: (res: any) => {
      return res;
    },
    onComplete: () => {
      // Callback when Swagger UI is loaded
      console.log('Swagger UI loaded successfully');
    }
  },
  customJs: `
    // Custom JavaScript for better authorization handling
    window.onload = function() {
      console.log('Swagger UI custom script loaded');
      
      // Auto-focus on authorize button if needed
      const authorizeBtn = document.querySelector('.btn.authorize');
      if (authorizeBtn) {
        console.log('Authorize button found');
      }
    };
  `
}));

// Swagger JSON specification
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(swaggerSpec);
});

// Swagger diagnostics endpoint
app.get('/api-docs/diagnostics', (req, res) => {
  const diagnostics = {
    environment: process.env.NODE_ENV,
    baseUrl: process.env.NODE_ENV === 'production' ? 'https://olimpxx.pp.ua' : 'http://localhost:3001',
    swaggerSpecKeys: Object.keys(swaggerSpec),
    pathsCount: Object.keys((swaggerSpec as any).paths || {}).length,
    componentsCount: Object.keys((swaggerSpec as any).components?.schemas || {}).length,
    timestamp: new Date().toISOString(),
    headers: req.headers,
    userAgent: req.get('User-Agent')
  };
  
  res.json(diagnostics);
});

// Test endpoint for Swagger authorization
app.get('/api/test/auth', authMiddleware, (req, res) => {
  res.json({
    message: 'Authorization successful',
    user: {
      id: (req as any).user?.id,
      email: (req as any).user?.email,
      role: (req as any).user?.role
    },
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/api/test', testSwaggerRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/tournaments', authMiddleware, tournamentRoutes);
app.use('/api/public/tournaments', tournamentRoutes); // Public route without auth
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/students', authMiddleware, studentRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/code-execution', codeExecutionRoutes);
app.use('/api/logs', authMiddleware, logRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// Direct payment callback route (without /api/v1 prefix)
app.use('/payment', paymentRoutes);

// Swagger documentation routes (for API documentation only)
app.use('/swagger-docs/users', authMiddleware, userSwaggerRoutes);
app.use('/swagger-docs/subscriptions', subscriptionSwaggerRoutes);
app.use('/swagger-docs/tournaments', authMiddleware, tournamentSwaggerRoutes);
app.use('/swagger-docs/tasks', authMiddleware, taskSwaggerRoutes);
app.use('/swagger-docs/payment', paymentSwaggerRoutes);

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
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`📄 Swagger JSON: http://localhost:${PORT}/api-docs.json`);
  
  // Log vConsole status on startup
  const vConsoleEnabled = process.env.VITE_ENABLE_VCONSOLE === 'true';
  console.log('🔧 vConsole Configuration:', {
    VITE_ENABLE_VCONSOLE: process.env.VITE_ENABLE_VCONSOLE,
    enabled: vConsoleEnabled,
    environment: process.env.NODE_ENV,
    message: vConsoleEnabled ? '✅ vConsole will be available on mobile devices' : '❌ vConsole is disabled'
  });

  // Log cron service status
  console.log('⏰ Cron Service Status:', cronService.getTaskStatus());
  console.log('🗓️  Monthly session cleanup scheduled for 1st of each month at 2:00 AM');
});

export default app;