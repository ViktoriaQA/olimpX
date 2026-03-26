import { test, expect } from '../fixtures/auth.fixture';
import { HomePage } from '../pages/HomePage';
import { TournamentsPage } from '../pages/TournamentsPage';

test.describe('Smoke Tests', () => {
  let homePage: HomePage;
  let tournamentsPage: TournamentsPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    tournamentsPage = new TournamentsPage(page);
  });

  test('@Smoke should load home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check critical elements
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    const title = await page.title();
    expect(title).toContain('Xcode');
  });

  test('@Smoke should load tournaments page', async ({ page }) => {
    await tournamentsPage.navigateToTournaments();
    await tournamentsPage.waitForTournamentsToLoad();
    
    // Check page structure
    const title = await page.title();
    expect(title).toContain('Tournaments');
    
    // List should exist (even if empty)
    const listContainer = page.locator('[data-testid="tournaments-list"]');
    await expect(listContainer).toBeAttached();
  });

  test('@Smoke should load auth page', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    expect(title).toContain('Auth');
    
    // Check auth forms exist
    const authForms = await page.locator('form').count();
    expect(authForms).toBeGreaterThan(0);
  });

  test('@Smoke should handle navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to tournaments
    await page.click('[data-testid="tournaments-link"]');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('/tournaments');
  });
});
