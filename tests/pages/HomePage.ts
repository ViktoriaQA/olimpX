import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly getStartedButton: Locator;
  readonly tournamentsLink: Locator;
  readonly tasksLink: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly heroSection: Locator;

  constructor(page: Page) {
    super(page);
    this.getStartedButton = page.locator('[data-testid="get-started-btn"]');
    this.tournamentsLink = page.locator('[data-testid="tournaments-link"]');
    this.tasksLink = page.locator('[data-testid="tasks-link"]');
    this.loginButton = page.locator('[data-testid="login-btn"]');
    this.registerButton = page.locator('[data-testid="register-btn"]');
    this.heroSection = page.locator('[data-testid="hero-section"]');
  }

  async navigateToHome(): Promise<void> {
    await this.navigateTo('/');
  }

  async clickGetStarted(): Promise<void> {
    await this.clickElement(this.getStartedButton);
  }

  async navigateToTournaments(): Promise<void> {
    await this.clickElement(this.tournamentsLink);
  }

  async navigateToTasks(): Promise<void> {
    await this.clickElement(this.tasksLink);
  }

  async clickLogin(): Promise<void> {
    await this.clickElement(this.loginButton);
  }

  async clickRegister(): Promise<void> {
    await this.clickElement(this.registerButton);
  }

  async verifyHeroSectionVisible(): Promise<boolean> {
    return await this.verifyElementVisible(this.heroSection);
  }

  async verifyNavigationLinksVisible(): Promise<boolean> {
    const tournamentsVisible = await this.verifyElementVisible(this.tournamentsLink);
    const tasksVisible = await this.verifyElementVisible(this.tasksLink);
    return tournamentsVisible && tasksVisible;
  }
}
