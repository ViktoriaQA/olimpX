import { test, expect } from '../fixtures/auth.fixture';
import { TournamentsPage } from '../pages/TournamentsPage';
import { HomePage } from '../pages/HomePage';

test.describe('Tournaments', () => {
  let tournamentsPage: TournamentsPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    tournamentsPage = new TournamentsPage(page);
    homePage = new HomePage(page);
  });

  test('should display tournaments page correctly', async ({ page }) => {
    await tournamentsPage.navigateToTournaments();
    await tournamentsPage.waitForPageLoad();
    
    expect(await tournamentsPage.verifyTournamentsListVisible()).toBe(true);
  });

  test('should navigate to tournaments from home', async ({ page }) => {
    await homePage.navigateToHome();
    await homePage.navigateToTournaments();
    
    expect(page.url()).toContain('/tournaments');
    expect(await tournamentsPage.verifyTournamentsListVisible()).toBe(true);
  });

  test('should display create tournament button for authenticated users', async ({ authenticatedPage }) => {
    tournamentsPage = new TournamentsPage(authenticatedPage);
    await tournamentsPage.navigateToTournaments();
    await tournamentsPage.waitForTournamentsToLoad();
    
    expect(await tournamentsPage.verifyCreateButtonVisible()).toBe(true);
  });

  test('should not display create tournament button for unauthenticated users', async ({ page }) => {
    await tournamentsPage.navigateToTournaments();
    await tournamentsPage.waitForTournamentsToLoad();
    
    expect(await tournamentsPage.verifyCreateButtonVisible()).toBe(false);
  });

  test('should search tournaments', async ({ page }) => {
    await tournamentsPage.navigateToTournaments();
    await tournamentsPage.waitForTournamentsToLoad();
    
    const initialCount = await tournamentsPage.getTournamentsCount();
    await tournamentsPage.searchTournaments('test');
    await page.waitForTimeout(1000);
    
    const searchResults = await tournamentsPage.getTournamentsCount();
    expect(searchResults).toBeLessThanOrEqual(initialCount);
  });

  test('should switch between available and my tournaments tabs', async ({ authenticatedPage }) => {
    tournamentsPage = new TournamentsPage(authenticatedPage);
    await tournamentsPage.navigateToTournaments();
    await tournamentsPage.waitForTournamentsToLoad();
    
    await tournamentsPage.clickMyTournamentsTab();
    await authenticatedPage.waitForTimeout(1000);
    
    await tournamentsPage.clickAvailableTournamentsTab();
    await authenticatedPage.waitForTimeout(1000);
    
    expect(await tournamentsPage.verifyTournamentsListVisible()).toBe(true);
  });

  test('should display tournament cards with required information', async ({ page }) => {
    await tournamentsPage.navigateToTournaments();
    await tournamentsPage.waitForTournamentsToLoad();
    
    const hasTournaments = await tournamentsPage.getTournamentsCount() > 0;
    if (hasTournaments) {
      expect(await tournamentsPage.verifyTournamentCardVisible()).toBe(true);
      
      const firstTitle = await tournamentsPage.getFirstTournamentTitle();
      expect(firstTitle).toBeTruthy();
      expect(firstTitle?.length).toBeGreaterThan(0);
    }
  });

  test('should handle tournament registration', async ({ authenticatedPage }) => {
    tournamentsPage = new TournamentsPage(authenticatedPage);
    await tournamentsPage.navigateToTournaments();
    await tournamentsPage.waitForTournamentsToLoad();
    
    const tournamentCount = await tournamentsPage.getTournamentsCount();
    if (tournamentCount > 0) {
      await tournamentsPage.clickFirstTournament();
      await authenticatedPage.waitForLoadState('networkidle');
      
      expect(authenticatedPage.url()).toContain('/tournaments/');
      
      const registerButton = authenticatedPage.locator('[data-testid="register-btn"]');
      if (await registerButton.isVisible()) {
        await registerButton.click();
        await authenticatedPage.waitForTimeout(2000);
        
        const successMessage = authenticatedPage.locator('[data-testid="success-message"]');
        if (await successMessage.isVisible()) {
          const message = await successMessage.textContent();
          expect(message).toContain('зареєстрували');
        }
      }
    }
  });

  test('should handle tournament creation for admin users', async ({ adminPage }) => {
    tournamentsPage = new TournamentsPage(adminPage);
    await tournamentsPage.navigateToTournaments();
    await tournamentsPage.waitForTournamentsToLoad();
    
    expect(await tournamentsPage.verifyCreateButtonVisible()).toBe(true);
    
    await tournamentsPage.clickCreateTournament();
    await adminPage.waitForLoadState('networkidle');
    
    const currentUrl = adminPage.url();
    const hasCreateUrl = currentUrl.includes('/tournaments/create');
    const hasAdminUrl = currentUrl.includes('/admin');
    
    expect(hasCreateUrl || hasAdminUrl).toBe(true);
  });

  test('should handle tournament filtering', async ({ page }) => {
    await tournamentsPage.navigateToTournaments();
    await tournamentsPage.waitForTournamentsToLoad();
    
    const filterButton = page.locator('[data-testid="filter-btn"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      
      const difficultyFilter = page.locator('[data-testid="difficulty-filter"]');
      if (await difficultyFilter.isVisible()) {
        await difficultyFilter.click();
        await page.locator('[data-value="easy"]').click();
        await page.waitForTimeout(1000);
        
        expect(await tournamentsPage.verifyTournamentsListVisible()).toBe(true);
      }
    }
  });
});
