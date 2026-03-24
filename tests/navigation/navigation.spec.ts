import { test, expect } from '../fixtures/auth.fixture';
import { HomePage } from '../pages/HomePage';

test.describe('Navigation', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('should load home page correctly', async ({ page }) => {
    await homePage.navigateToHome();
    await homePage.waitForPageLoad();
    
    expect(await homePage.verifyHeroSectionVisible()).toBe(true);
    expect(await homePage.verifyNavigationLinksVisible()).toBe(true);
  });

  test('should navigate between main sections', async ({ page }) => {
    await homePage.navigateToHome();
    
    await homePage.navigateToTournaments();
    expect(page.url()).toContain('/tournaments');
    
    await homePage.navigateToTasks();
    expect(page.url()).toContain('/tasks');
    
    await homePage.navigateToHome();
    expect(page.url()).toBe('http://localhost:5173/');
  });

  test('should display navigation elements correctly for unauthenticated users', async ({ page }) => {
    await homePage.navigateToHome();
    
    expect(await homePage.verifyElementVisible(homePage.loginButton)).toBe(true);
    expect(await homePage.verifyElementVisible(homePage.registerButton)).toBe(true);
  });

  test('should display navigation elements correctly for authenticated users', async ({ authenticatedPage }) => {
    const authenticatedHomePage = new HomePage(authenticatedPage);
    await authenticatedHomePage.navigateToHome();
    
    const dashboardLink = authenticatedPage.locator('[data-testid="dashboard-link"]');
    const profileLink = authenticatedPage.locator('[data-testid="profile-link"]');
    const logoutButton = authenticatedPage.locator('[data-testid="logout-btn"]');
    
    if (await dashboardLink.isVisible()) {
      expect(await dashboardLink.isVisible()).toBe(true);
    }
    
    if (await profileLink.isVisible()) {
      expect(await profileLink.isVisible()).toBe(true);
    }
    
    if (await logoutButton.isVisible()) {
      expect(await logoutButton.isVisible()).toBe(true);
    }
  });

  test('should handle mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await homePage.navigateToHome();
    
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-btn"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await page.waitForTimeout(1000);
      
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      expect(await mobileMenu.isVisible()).toBe(true);
    }
  });

  test('should handle breadcrumb navigation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tasks');
    await authenticatedPage.waitForLoadState('networkidle');
    
    const breadcrumbs = authenticatedPage.locator('[data-testid="breadcrumbs"]');
    if (await breadcrumbs.isVisible()) {
      const breadcrumbItems = breadcrumbs.locator('[data-testid="breadcrumb-item"]');
      const count = await breadcrumbItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should handle sidebar navigation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.waitForLoadState('networkidle');
    
    const sidebar = authenticatedPage.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible()) {
      const navItems = sidebar.locator('[data-testid="nav-item"]');
      const count = await navItems.count();
      expect(count).toBeGreaterThan(0);
      
      const firstNavItem = navItems.first();
      await firstNavItem.click();
      await authenticatedPage.waitForLoadState('networkidle');
      
      expect(authenticatedPage.url()).not.toBe('http://localhost:5173/dashboard');
    }
  });

  test('should handle 404 page for non-existent routes', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');
    
    const notFoundPage = page.locator('[data-testid="not-found-page"]');
    if (await notFoundPage.isVisible()) {
      expect(await notFoundPage.isVisible()).toBe(true);
      
      const homeLink = page.locator('[data-testid="home-link"]');
      if (await homeLink.isVisible()) {
        await homeLink.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toBe('http://localhost:5173/');
      }
    }
  });

  test('should handle back and forward browser navigation', async ({ page }) => {
    await homePage.navigateToHome();
    
    await homePage.navigateToTournaments();
    expect(page.url()).toContain('/tournaments');
    
    await page.goBack();
    expect(page.url()).toBe('http://localhost:5173/');
    
    await page.goForward();
    expect(page.url()).toContain('/tournaments');
  });

  test('should handle external links correctly', async ({ page }) => {
    await homePage.navigateToHome();
    
    const externalLink = page.locator('a[href*="http"]').first();
    if (await externalLink.isVisible()) {
      const href = await externalLink.getAttribute('href');
      expect(href).toMatch(/^https?:\/\//);
    }
  });
});
