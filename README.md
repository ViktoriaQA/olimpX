# olimpX

**CodeArena** - a comprehensive programming tournament platform with full-featured task and tournament management system.

## 🚀 Features

- 🔐 **Authentication** via Supabase Auth
- 👥 **User Management** with role-based access (student/trainer/admin)
- 💳 **Payment System** with Monobank integration and auto-renewal subscriptions
- 🏆 **Tournament System** - create and manage tournaments
- 📝 **Task System** - full-featured task editor with test cases
- 📊 **Statistics & Progress** - track user performance
- 🎯 **Code Execution** - support for multiple languages (Python, JavaScript, C++)

## 🛠 Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **TailwindCSS** + **shadcn/ui** components
- **React Query** for state management
- **CodeMirror/Monaco** code editors
- **React Router** for navigation
- **i18next** for internationalization

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Supabase** (PostgreSQL) as database
- **Supabase Auth** for authentication
- **Joi** for data validation
- **Helmet**, **CORS** for security

### Testing & DevOps
- **Playwright** for E2E testing
- **Docker** for containerization
- **GitHub Actions** CI/CD

## 📁 Project Structure

```
olimpX/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Application pages
│   │   ├── hooks/       # Custom hooks
│   │   └── services/    # API services
├── backend/           # Node.js API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Middleware
│   │   └── utils/       # Utilities
├── tests/             # E2E tests
└── docs/              # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase project

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
4. Fill `.env` file with your Supabase credentials

### Running
```bash
# Start development mode
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Build for production
npm run build

# Start production server
npm start
```

## 📚 API Documentation

### Authentication
All endpoints (except verification) require Bearer token:
```
Authorization: Bearer <supabase-jwt-token>
```

### Main Endpoints

#### Users
- `GET /api/users/profile` - get user profile
- `PUT /api/users/profile` - update profile
- `GET /api/users/role` - get user role

#### Subscriptions
- `GET /api/subscriptions/plans` - get subscription plans
- `GET /api/subscriptions/status` - subscription status
- `POST /api/subscriptions/payments` - create payment

#### Tasks
- `GET /api/tasks` - get tasks with filtering
- `POST /api/tasks` - create task (trainer/admin)
- `GET /api/tasks/:id` - get task
- `PUT /api/tasks/:id` - update task (trainer/admin)
- `POST /api/tasks/:id/submit` - submit solution
- `GET /api/tasks/progress` - user progress

#### Tournaments
- `GET /api/tournaments` - get tournaments
- `POST /api/tournaments` - create tournament (trainer/admin)
- `POST /api/tournaments/:id/join` - join tournament

## 👥 User Roles

- **student** - can solve tasks, participate in tournaments
- **trainer** - can create tasks and tournaments, view student progress
- **admin** - full access to all features

## 🧪 Testing

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# Run tests with visible browser
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## 🌐 Test Server

The project includes automated testing on staging environment:

```bash
# Run tests against staging server
npm run test:e2e:staging

# Run tests against production server
npm run test:e2e:prod
```

**Test Environments:**
- **Staging**: https://olimpxx.pp.ua
- **Production**: https://xcode24.com

**Pre-push Checks:**
- Automatic smoke tests run before pushing to stage branch
- 4 core test scenarios verified
- Tests run in parallel using 4 workers
- ~8.5 seconds execution time

## 📦 Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set environment variables on your platform

3. Start the server:
   ```bash
   npm start
   ```

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Create meaningful commits

## 👨‍💻 Authors

- **Victoria Frantsukh** - Project lead & full-stack developer
- **Contributors** - Open source community


## 📄 License

MIT License