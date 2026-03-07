# Code Execution System Documentation

## Overview

The Code Execution System is a robust, fault-tolerant solution for executing code in multiple programming languages with automatic failover between different execution services. The system supports Python, JavaScript, TypeScript, and Go with automatic switching between JDoodle and OneCompiler APIs.

## Architecture

### Core Components

1. **CodeExecutionManager** - Central orchestrator managing all execution services
2. **JDoodleService** - Integration with JDoodle API
3. **OneCompilerService** - Integration with OneCompiler API  
4. **CodeExecutionFactory** - Service initialization and configuration
5. **CodeExecutionController** - API endpoints for frontend integration

### Flow Diagram

```
Frontend Request → Controller → CodeExecutionManager → Service Selection → API Call → Response
                                    ↓
                              Queue Management → Rate Limiting → Caching → Logging
```

## Features

### ✅ Implemented Features

- **Multi-language Support**: Python, JavaScript, TypeScript, Go
- **Automatic Failover**: Switches between JDoodle and OneCompiler on failures
- **Queue System**: Manages concurrent execution requests (max 5 concurrent, 100 queue size)
- **Rate Limiting**: Built-in rate limiting per service (JDoodle: 1s, OneCompiler: 2s)
- **Result Caching**: 5-minute cache for identical requests
- **Health Monitoring**: Automatic health checks and service recovery
- **Comprehensive Logging**: Detailed execution logs and error tracking
- **Input Validation**: Full request validation with detailed error messages
- **Performance Metrics**: Execution time, memory usage, service tracking

## API Endpoints

### 1. Get Supported Languages
```
GET /api/code-execution/languages
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "python",
      "versions": ["3.10.0"],
      "supported_services": ["JDoodle", "OneCompiler"]
    }
  ],
  "message": "Список доступних мов отримано успішно"
}
```

### 2. Execute Code
```
POST /api/code-execution/execute
```

**Request Body:**
```json
{
  "language": "python",
  "code": "print('Hello World')",
  "stdin": "",
  "time_limit": 10000,
  "memory_limit": 134217728
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "language": "python",
    "version": "3.10.0",
    "output": {
      "stdout": "Hello World\n",
      "stderr": "",
      "exit_code": 0,
      "time": 0.045,
      "memory": 28672,
      "signal": null,
      "compile_output": null
    },
    "execution_time_ms": 45,
    "memory_used_mb": 0,
    "status": "success",
    "service": "JDoodle",
    "request_time_ms": 123
  },
  "message": "Код виконано успішно"
}
```

### 3. Get Language Info
```
GET /api/code-execution/languages/:language
```

### 4. Get System Stats
```
GET /api/code-execution/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "queue_size": 0,
    "current_requests": 2,
    "cache_size": 15,
    "services": [
      {
        "name": "JDoodle",
        "priority": 1,
        "available": true
      },
      {
        "name": "OneCompiler", 
        "priority": 2,
        "available": true
      }
    ]
  }
}
```

### 5. Clear Cache
```
DELETE /api/code-execution/cache
```

## Service Configuration

### Environment Variables

```bash
# JDoodle API Configuration
JDOODLE_CLIENT_ID=your_jdoodle_client_id
JDOODLE_CLIENT_SECRET=your_jdoodle_client_secret

# OneCompiler API Configuration  
ONECOMPILER_API_KEY=your_onecompiler_api_key
```

### Service Priority

1. **JDoodle** (Priority: 1) - Primary service
2. **OneCompiler** (Priority: 2) - Backup service

## Rate Limiting

### Service-specific Limits

- **JDoodle**: 1 request per second
- **OneCompiler**: 2 requests per second

### System Limits

- **Max Concurrent Requests**: 5
- **Max Queue Size**: 100
- **Max Retries**: 3 per request

## Caching Strategy

### Cache Key Generation

Cache keys are generated based on:
- Language
- Code content
- Input (stdin)
- Time limit
- Memory limit

### Cache TTL

- **Default**: 5 minutes
- **Cache Size**: Unlimited (managed by memory)

## Error Handling

### Service Failures

1. **Automatic Failover**: Switch to next available service
2. **Health Checks**: Background health monitoring every 30 seconds
3. **Service Recovery**: Automatic re-enablement on successful health check

### Error Responses

```json
{
  "success": false,
  "message": "Помилка виконання коду",
  "error": "JDoodle API error: Rate limit exceeded"
}
```

## Monitoring and Logging

### Event Types

- **execution_completed**: Successful code execution
- **execution_failed**: Failed execution with retry attempts
- **service_health_check**: Service availability monitoring

### Log Levels

- **INFO**: Service initialization, successful executions
- **WARN**: Service failures, cache misses
- **ERROR**: API errors, validation failures

## Security Features

### Input Validation

- **Code Length**: Max 50,000 characters
- **Input Length**: Max 10,000 characters
- **Time Limit**: 100ms - 60 seconds
- **Memory Limit**: 1MB - 1GB

### Language Restrictions

Only supported languages are allowed:
- Python
- JavaScript
- TypeScript
- Go

## Performance Optimization

### Connection Pooling

- HTTP connections are reused via Axios instances
- Timeout configuration: 30 seconds per request

### Memory Management

- Cache cleanup on memory pressure
- Queue size limits to prevent memory overflow
- Automatic garbage collection of old cache entries

## Deployment

### Production Setup

1. **Environment Variables**: Configure API keys
2. **Service Health**: Monitor service availability
3. **Resource Limits**: Set appropriate memory/CPU limits
4. **Monitoring**: Track queue size and response times

### Docker Configuration

```dockerfile
# Environment variables for services
ENV JDOODLE_CLIENT_ID=${JDOODLE_CLIENT_ID}
ENV JDOODLE_CLIENT_SECRET=${JDOODLE_CLIENT_SECRET}
ENV ONECOMPILER_API_KEY=${ONECOMPILER_API_KEY}
```

## Troubleshooting

### Common Issues

1. **Service Unavailable**
   - Check API keys in environment variables
   - Verify service health via `/stats` endpoint
   - Monitor logs for connection errors

2. **Queue Full**
   - Reduce concurrent requests
   - Check for long-running executions
   - Monitor system performance

3. **High Memory Usage**
   - Clear cache via `/cache` endpoint
   - Reduce cache TTL
   - Monitor queue size

### Debug Commands

```bash
# Check system stats
curl http://localhost:3001/api/code-execution/stats

# Clear cache
curl -X DELETE http://localhost:3001/api/code-execution/cache

# Test execution
curl -X POST http://localhost:3001/api/code-execution/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"print(\"test\")"}'
```

## Future Enhancements

### Planned Features

- **Additional Services**: Integration with more execution APIs
- **Custom Runtimes**: Support for custom language versions
- **Advanced Caching**: Redis-based distributed caching
- **Analytics**: Detailed execution analytics dashboard
- **WebSocket Support**: Real-time execution status updates

### Scalability Options

- **Horizontal Scaling**: Multiple instances with shared queue
- **Load Balancing**: Intelligent service selection based on performance
- **Geographic Distribution**: Region-specific service endpoints

## Testing

### Unit Tests

```bash
# Test individual services
npm test -- --testPathPattern=jdoodleService
npm test -- --testPathPattern=oneCompilerService
npm test -- --testPathPattern=codeExecutionManager
```

### Integration Tests

```bash
# Test full execution flow
npm test -- --testPathPattern=codeExecution.integration
```

### Load Testing

```bash
# Test concurrent execution
npm run test:load:code-execution
```

## License

MIT License - See LICENSE file for details.
