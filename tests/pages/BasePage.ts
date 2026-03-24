import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly header: Locator;
  readonly sidebar: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header');
    this.sidebar = page.locator('[data-testid="sidebar"]');
    this.footer = page.locator('footer');
  }

  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(fileName: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${fileName}` });
  }

  async verifyElementVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  async clickElement(locator: Locator): Promise<void> {
    await locator.click();
  }

  async fillInput(locator: Locator, value: string): Promise<void> {
    await locator.fill(value);
  }

  async waitForElement(locator: Locator, timeout: number = 5000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  async verifyTextContent(locator: Locator, expectedText: string): Promise<boolean> {
    const text = await locator.textContent();
    return text?.includes(expectedText) || false;
  }
}
