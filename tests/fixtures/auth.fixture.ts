import { test as base, Page } from '@playwright/test';

export interface AuthUser {
  email: string;
  password: string;
  name: string;
}

export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
}>({
  authenticatedPage: async ({ page, context }, use) => {
    const testUser: AuthUser = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User'
    };

    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock_jwt_token',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'user_data',
        value: JSON.stringify({
          id: 1,
          email: testUser.email,
          name: testUser.name,
          role: 'user'
        }),
        domain: 'localhost',
        path: '/',
      }
    ]);

    await use(page);
  },

  adminPage: async ({ page, context }, use) => {
    const adminUser: AuthUser = {
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      name: 'Admin User'
    };

    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock_admin_jwt_token',
        domain: 'localhost',
        path: '/',
      },
      {
        name: 'user_data',
        value: JSON.stringify({
          id: 1,
          email: adminUser.email,
          name: adminUser.name,
          role: 'admin'
        }),
        domain: 'localhost',
        path: '/',
      }
    ]);

    await use(page);
  }
});

export { expect } from '@playwright/test';
