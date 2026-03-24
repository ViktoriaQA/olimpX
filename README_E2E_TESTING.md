# E2E Testing with Playwright

This document describes the E2E testing setup for the OlimpX project using Playwright.

## 📋 Table of Contents

- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Page Objects](#page-objects)
- [Test Data](#test-data)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## 🚀 Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for running tests in CI)

### Installation

1. Install dependencies:
```bash
npm install
npm run test:e2e:install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

## 🏃 Running Tests

### Local Development

```bash
# Run all tests
npm run test:e2e

# Run tests in UI mode (recommended for development)
npm run test:e2e:ui

# Run tests with browser window visible
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/auth/auth.spec.ts

# Run tests with specific pattern
npx playwright test --grep "authentication"
```

### Test Reports

After running tests, you can view the HTML report:

```bash
npx playwright show-report
```

## 📁 Test Structure

```
tests/
├── fixtures/
│   └── auth.fixture.ts          # Authentication fixtures
├── pages/
│   ├── BasePage.ts              # Base page class
│   ├── HomePage.ts              # Home page object
│   ├── AuthPage.ts              # Auth page object
│   ├── TournamentsPage.ts      # Tournaments page object
│   └── TasksPage.ts             # Tasks page object
├── utils/
│   ├── test-data.ts            # Test data constants
│   └── helpers.ts              # Utility functions
├── auth/
│   └── auth.spec.ts            # Authentication tests
├── tournaments/
│   └── tournaments.spec.ts     # Tournament tests
├── tasks/
│   └── tasks.spec.ts           # Task tests
├── navigation/
│   └── navigation.spec.ts      # Navigation tests
└── accessibility/
    └── accessibility.spec.ts   # Accessibility tests
```

## 🎭 Page Objects

Page Objects provide a clean abstraction for interacting with web pages:

### BasePage

Common functionality shared across all pages:
- Navigation
- Element interactions
- Waiting strategies
- Screenshot capabilities

### Specific Page Objects

Each major feature has its own page object:
- `HomePage`: Landing page functionality
- `AuthPage`: Login/registration forms
- `TournamentsPage`: Tournament browsing/management
- `TasksPage`: Task browsing/creation/solving

## 📊 Test Data

Centralized test data in `tests/utils/test-data.ts`:
- User credentials
- Sample tournament/task data
- Search queries
- Filter options
- Test messages

## 🔄 Fixtures

Authentication fixtures provide pre-configured page instances:
- `authenticatedPage`: Page with regular user session
- `adminPage`: Page with admin user session

## 🎯 Test Categories

### 1. Authentication Tests (`tests/auth/`)
- Login form validation
- Registration form validation
- Session management
- Route protection

### 2. Tournament Tests (`tests/tournaments/`)
- Tournament browsing
- Tournament creation (admin)
- Tournament registration
- Search and filtering

### 3. Task Tests (`tests/tasks/`)
- Task browsing
- Task creation
- Task solving
- Task editing/deletion

### 4. Navigation Tests (`tests/navigation/`)
- Route navigation
- Mobile navigation
- Breadcrumb navigation
- 404 handling

### 5. Accessibility Tests (`tests/accessibility/`)
- Page titles
- Heading hierarchy
- Form labels
- Keyboard navigation
- Color contrast

## 🚀 CI/CD Integration

Tests automatically run on:
- Push to `main`/`develop` branches
- Pull requests to `main`/`develop` branches

### GitHub Actions Workflow

The workflow (`.github/workflows/e2e-tests.yml`):
1. Sets up Node.js environment
2. Installs dependencies
3. Builds the application
4. Starts services (PostgreSQL, app)
5. Runs E2E tests
6. Uploads test results and artifacts

### Test Results

- HTML report: `playwright-report/`
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`

## 📝 Best Practices

### 1. Test Organization
- Use descriptive test names
- Group related tests in `describe` blocks
- Use fixtures for common setup

### 2. Selectors
- Use `data-testid` attributes for test selectors
- Avoid CSS selectors that depend on styling
- Use semantic selectors when appropriate

### 3. Waits
- Use explicit waits over implicit waits
- Wait for specific conditions, not fixed timeouts
- Use `waitForLoadState('networkidle')` for page loads

### 4. Assertions
- Use specific assertions over generic ones
- Assert meaningful user-visible outcomes
- Include helpful error messages

### 5. Test Data
- Use centralized test data
- Generate random data where appropriate
- Clean up test data after tests

### 6. Page Objects
- Keep page objects focused on single pages
- Abstract implementation details
- Return meaningful objects from methods

### 7. Error Handling
- Handle expected failures gracefully
- Provide clear error messages
- Use retries for flaky operations

## 🔧 Configuration

### Playwright Config (`playwright.config.ts`)

Key settings:
- Multiple browsers (Chrome, Firefox, Safari)
- Mobile viewport testing
- Automatic screenshots on failure
- Video recording for failed tests
- Automatic server startup

### Environment Variables

Required for test execution:
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to `test` for test runs
- `VITE_ENABLE_VCONSOLE`: Enable mobile debugging

## 🐛 Debugging

### Debug Mode
```bash
npm run test:e2e:debug
```

### VS Code Integration
Install Playwright VS Code extension for:
- Test discovery
- Debugging
- Test runner UI

### Browser DevTools
Use `headed` mode to inspect browser state:
```bash
npm run test:e2e:headed
```

## 📈 Coverage

Current test coverage includes:
- ✅ Authentication flows
- ✅ Tournament management
- ✅ Task management
- ✅ Navigation
- ✅ Basic accessibility
- 🔄 Mobile responsiveness
- 🔄 Admin panel features
- 🔄 Payment flows

## 🚧 Future Enhancements

1. **Visual Regression Testing**: Add visual comparison tests
2. **API Testing**: Expand API-level test coverage
3. **Performance Testing**: Add performance benchmarks
4. **Cross-browser Testing**: Expand browser coverage
5. **Mobile Testing**: Enhanced mobile-specific tests
6. **Component Testing**: Add component-level E2E tests

## 📞 Support

For questions about E2E testing:
1. Check this documentation
2. Review existing test files
3. Consult Playwright documentation
4. Create an issue for specific problems
