# CodeArena API Swagger Documentation

## Overview

This document provides comprehensive Swagger/OpenAPI 3.0 documentation for the CodeArena Backend API. The documentation is automatically generated and can be accessed through the Swagger UI interface.

## Accessing Documentation

### Development Environment
- **Swagger UI**: http://localhost:3001/api-docs
- **JSON Specification**: http://localhost:3001/api-docs.json

### Production Environment
- **Swagger UI**: https://olimpxx.pp.ua/api-docs
- **JSON Specification**: https://olimpxx.pp.ua/api-docs.json

## API Categories

### 1. Authentication (`/auth`)
Endpoints for user authentication and authorization:
- User registration and login
- Profile management
- OAuth integration (Google, Discord)
- Phone and email verification

### 2. Users (`/api/users`)
User management endpoints:
- Profile operations
- Role management
- User statistics
- Subscription information
- Admin functions

### 3. Subscriptions (`/api/subscriptions`)
Subscription management:
- Plan information
- Payment history
- Subscription status
- Admin plan management

### 4. Payments (`/api/v1/payment`)
Payment processing via LiqPay:
- Payment initiation
- Callback handling
- Status checking
- Receipt generation
- Subscription management

### 5. Code Execution (`/api/code-execution`)
Code execution system:
- Language support
- Code execution
- Test running
- System statistics
- Cache management

### 6. Tournaments (`/api/tournaments`)
Tournament management:
- Tournament CRUD operations
- Participation management
- Leaderboard access
- Results tracking

### 7. Tasks (`/api/tasks`)
Programming tasks:
- Task management
- Solution submission
- Progress tracking
- Statistics and analytics

## Authentication

Most endpoints require authentication using Bearer tokens:

```http
Authorization: Bearer <supabase-jwt-token>
```

### User Roles
- **student**: Can view tasks, join tournaments, submit solutions
- **trainer**: Can create/manage tasks and tournaments, view student progress
- **admin**: Full access including user management and subscription plans

## Response Format

All API responses follow a consistent structure:

### Success Response
```json
{
  "data": { ... },
  "message": "Optional success message",
  "pagination": { ... } // For paginated responses
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "stack": "Error stack (development only)"
  }
}
```

## Rate Limiting

Some endpoints have rate limiting applied:
- **Code Execution**: 1-2 requests per second depending on service
- **Payment**: Limited to prevent abuse
- **General API**: Standard rate limiting

## Data Schemas

The API uses the following main data schemas:

### User
```json
{
  "id": "string",
  "email": "string",
  "nickname": "string",
  "role": "student|trainer|admin",
  "subscription_status": "active|inactive|expired",
  "subscription_expires_at": "2024-01-01T00:00:00Z",
  "avatar_url": "string",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Subscription Plan
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "price": 99.99,
  "currency": "UAH",
  "billing_period": "month|year",
  "features": ["string"],
  "is_active": true
}
```

### Tournament
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "start_time": "2024-01-01T00:00:00Z",
  "end_time": "2024-01-01T00:00:00Z",
  "status": "upcoming|active|completed|cancelled",
  "max_participants": 100,
  "current_participants": 50,
  "prize_pool": 1000.00
}
```

### Task
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "difficulty": "easy|medium|hard",
  "category": "string",
  "time_limit": 10000,
  "memory_limit": 134217728,
  "points": 100,
  "languages": ["python", "javascript"]
}
```

### Code Execution Request
```json
{
  "language": "python",
  "code": "print('Hello World')",
  "stdin": "",
  "time_limit": 10000,
  "memory_limit": 134217728
}
```

### Code Execution Response
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
      "memory": 28672
    },
    "execution_time_ms": 45,
    "status": "success",
    "service": "JDoodle"
  },
  "message": "Code executed successfully"
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Integration Examples

### JavaScript/TypeScript
```typescript
// Authentication
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { data: { token } } = await loginResponse.json();

// Authenticated request
const profileResponse = await fetch('/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Python
```python
import requests

# Authentication
login_response = requests.post('http://localhost:3001/auth/login', json={
    'email': 'user@example.com',
    'password': 'password123'
})

token = login_response.json()['data']['token']

# Authenticated request
profile_response = requests.get('http://localhost:3001/api/users/profile', 
    headers={'Authorization': f'Bearer {token}'})
```

### cURL
```bash
# Authentication
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Authenticated request
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Testing

The Swagger UI provides built-in testing capabilities:
1. Navigate to any endpoint
2. Click "Try it out"
3. Fill in required parameters
4. Execute the request
5. View the response

## Development

### Adding New Endpoints
1. Create the route handler in the appropriate routes file
2. Add Swagger annotations using `@swagger` comments
3. Update the schemas if needed
4. Test the endpoint through Swagger UI

### Schema Updates
When modifying data structures:
1. Update the schema definitions in `src/config/swagger.ts`
2. Ensure all references are updated
3. Test affected endpoints

### Documentation Standards
- Use clear, concise descriptions
- Include all required parameters
- Provide example values
- Document error responses
- Use consistent formatting

## Support

For API-related questions or issues:
1. Check the Swagger UI documentation
2. Review the error messages
3. Contact the development team
4. Check the application logs for debugging

## Changelog

### v1.0.0
- Initial API documentation
- Complete endpoint coverage
- Schema definitions
- Authentication and authorization
- Code execution system
- Payment processing
- Tournament and task management
