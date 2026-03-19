# Docker Deployment Guide

## Quick Start

1. **Prepare environment variables:**
   ```bash
   cp .env.docker .env
   # Edit .env with your actual values
   ```

2. **Build and run with Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

3. **Check logs:**
   ```bash
   docker-compose logs -f app
   ```

4. **Health check:**
   ```bash
   curl http://localhost:8080/health
   ```

## Environment Variables

### Required Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `JWT_SECRET` - JWT signing secret
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Telegram chat ID for notifications

### Optional Variables
- `NODE_ENV` - Environment (default: production)
- `PORT` - Application port (default: 8080)
- `FRONTEND_URL` - Frontend URL for CORS

## Docker Build Process

The Dockerfile uses multi-stage builds:

1. **Frontend Builder:** Builds the React/Vite frontend
2. **Backend Builder:** Compiles TypeScript backend
3. **Final Stage:** Production runtime with only necessary dependencies

## Production Deployment

### Using Docker Compose (Recommended)
```bash
# Set production environment
export NODE_ENV=production

# Build and deploy
docker-compose -f docker-compose.yml up -d --build
```

### Manual Docker Build
```bash
# Build image
docker build -t olimpx-backend .

# Run container
docker run -d \
  --name olimpx-app \
  -p 8080:8080 \
  --env-file .env \
  olimpx-backend
```

## Troubleshooting

### Server Crashes on Startup
1. Check environment variables:
   ```bash
   docker-compose logs app | grep -E "(Missing|Error|❌)"
   ```

2. Verify .env file is properly configured

3. Check if all required services are accessible

### Health Check Issues
```bash
# Check container health
docker-compose ps

# Manual health check
curl http://localhost:8080/health
```

### Log Monitoring
```bash
# Follow logs in real-time
docker-compose logs -f app

# Check specific error patterns
docker-compose logs app | grep -i error
```

## Security Considerations

- Environment variables are passed at build time and runtime
- Container runs as non-root user (nodejs:1001)
- Only production dependencies are included
- Health checks monitor application status
- TLS termination should be handled by reverse proxy

## Reverse Proxy Configuration

For production, use nginx or similar reverse proxy:

```nginx
server {
    listen 443 ssl;
    server_name olimpxx.pp.ua;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
