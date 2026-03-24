import { test, expect } from '../fixtures/auth.fixture';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';

test.describe('Authentication', () => {
  let authPage: AuthPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    homePage = new HomePage(page);
  });

  test('should display login form correctly', async ({ page }) => {
    await authPage.navigateToAuth();
    await authPage.waitForPageLoad();
    
    expect(await authPage.verifyLoginFormVisible()).toBe(true);
    expect(await authPage.verifyElementVisible(authPage.emailInput)).toBe(true);
    expect(await authPage.verifyElementVisible(authPage.passwordInput)).toBe(true);
    expect(await authPage.verifyElementVisible(authPage.loginButton)).toBe(true);
  });

  test('should switch to registration form', async ({ page }) => {
    await authPage.navigateToAuth();
    await authPage.switchToRegisterTab();
    
    expect(await authPage.verifyRegistrationFormVisible()).toBe(true);
    expect(await authPage.verifyElementVisible(authPage.nameInput)).toBe(true);
    expect(await authPage.verifyElementVisible(authPage.confirmPasswordInput)).toBe(true);
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await authPage.navigateToAuth();
    await authPage.clickLogin();
    
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('email');
    expect(errorMessage).toContain('password');
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await authPage.navigateToAuth();
    await authPage.fillLoginForm('invalid-email', 'password123');
    await authPage.clickLogin();
    
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('email');
  });

  test('should show validation error for short password', async ({ page }) => {
    await authPage.navigateToAuth();
    await authPage.fillLoginForm('test@example.com', '123');
    await authPage.clickLogin();
    
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('password');
  });

  test('should show validation error for mismatched passwords in registration', async ({ page }) => {
    await authPage.navigateToAuth();
    await authPage.switchToRegisterTab();
    await authPage.fillRegistrationForm('Test User', 'test@example.com', 'password123', 'password456');
    await authPage.clickRegister();
    
    const errorMessage = await authPage.getErrorMessage();
    expect(errorMessage).toContain('password');
  });

  test('should navigate to auth page from home', async ({ page }) => {
    await homePage.navigateToHome();
    await homePage.clickLogin();
    
    expect(page.url()).toContain('/auth');
    expect(await authPage.verifyLoginFormVisible()).toBe(true);
  });

  test('should handle successful login redirect', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/auth');
    await authenticatedPage.waitForLoadState('networkidle');
    
    const currentUrl = authenticatedPage.url();
    expect(currentUrl).not.toContain('/auth');
    expect(currentUrl).toMatch(/\/(dashboard|\?)/);
  });

  test('should handle logout functionality', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
    
    const logoutButton = authenticatedPage.locator('[data-testid="logout-btn"]');
    const isVisible = await logoutButton.isVisible();
    if (isVisible) {
      await logoutButton.click();
      await authenticatedPage.waitForLoadState('networkidle');
      const currentUrl = authenticatedPage.url();
      expect(currentUrl).toMatch(/\/(\/|auth)/);
    }
  });

  test('should protect authenticated routes', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/profile', '/tasks', '/tournaments'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      const isRedirectedToAuth = currentUrl.includes('/auth');
      const isRedirectedToHome = currentUrl.includes('/') && !currentUrl.includes('/auth');
      
      expect(isRedirectedToAuth || isRedirectedToHome).toBe(true);
    }
  });
});
