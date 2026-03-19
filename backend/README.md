# CodeArena Backend API

Backend API for the CodeArena programming tournament platform built with Node.js, Express, and Supabase.

## Features

- 🔐 Authentication & Authorization (Supabase)
- 👥 User Management (Profiles, Roles)
- 💳 Subscription Management
- 🏆 Tournament System (Coming Soon)
- 📝 Task Management (Coming Soon)
- 💰 Payment Integration (Monobank)

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Language**: TypeScript
- **Validation**: Joi
- **Security**: Helmet, CORS

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project

### Installation

1. Clone the repository
2. Navigate to backend directory:
   ```bash
   cd backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
5. Configure your `.env` file with Supabase credentials

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## API Documentation

### Authentication

All API endpoints (except auth verification) require authentication via Bearer token.

```
Authorization: Bearer <supabase-jwt-token>
```

### Endpoints

#### Auth
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh access token

#### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/role` - Get user role
- `GET /api/users` - Admin: Get all users (paginated)
- `PUT /api/users/:userId/role` - Admin: Update user role
- `GET /api/users/students` - Trainer/Admin: Get all students

#### Subscriptions
- `GET /api/subscriptions/plans` - Get active subscription plans
- `GET /api/subscriptions/plans/:planId` - Get specific plan
- `GET /api/subscriptions/status` - Get user's subscription status
- `GET /api/subscriptions/payments` - Get user's payment history
- `POST /api/subscriptions/payments` - Create payment record
- `POST /api/subscriptions/plans` - Admin: Create subscription plan
- `PUT /api/subscriptions/plans/:planId` - Admin: Update plan
- `DELETE /api/subscriptions/plans/:planId` - Admin: Deactivate plan

#### Tournaments (Coming Soon)
- `GET /api/tournaments` - Get all tournaments
- `GET /api/tournaments/:id` - Get tournament details
- `POST /api/tournaments` - Trainer/Admin: Create tournament
- `PUT /api/tournaments/:id` - Trainer/Admin: Update tournament
- `POST /api/tournaments/:id/join` - Join tournament
- `GET /api/tournaments/:id/leaderboard` - Get tournament leaderboard

#### Tasks (Coming Soon)
- `GET /api/tasks` - Get all tasks (with filtering)
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Trainer/Admin: Create task
- `PUT /api/tasks/:id` - Trainer/Admin: Update task
- `POST /api/tasks/:id/submit` - Submit solution
- `GET /api/tasks/:id/submissions` - Get user's submissions
- `GET /api/tasks/progress` - Get user progress
- `GET /api/tasks/:id/stats` - Trainer/Admin: Get task statistics

### Response Format

All responses follow this structure:

```json
{
  "data": { ... },
  "message": "Optional message",
  "pagination": { ... } // For paginated responses
}
```

Error responses:

```json
{
  "error": {
    "message": "Error description",
    "stack": "Error stack (development only)"
  }
}
```

### User Roles

- **student**: Can view tasks, join tournaments, submit solutions
- **trainer**: Can create/manage tasks and tournaments, view student progress
- **admin**: Full access including user management and subscription plans

## Database Schema

The API uses Supabase with the following main tables:

- `profiles` - User profiles and subscription info
- `user_roles` - User role assignments
- `subscription_plans` - Available subscription plans
- `payments` - Payment history

Additional tables for tournaments and tasks will be added in future updates.

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set environment variables in your deployment platform

3. Start the server:
   ```bash
   npm start
   ```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Create meaningful commit messages

## License

MIT License