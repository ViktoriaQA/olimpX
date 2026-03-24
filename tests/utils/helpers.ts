import { Page, expect } from '@playwright/test';
import { timeouts } from './test-data';

export class TestHelpers {
  static async waitForElement(page: Page, selector: string, timeout: number = timeouts.medium): Promise<void> {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
  }

  static async waitForElementToDisappear(page: Page, selector: string, timeout: number = timeouts.medium): Promise<void> {
    await page.waitForSelector(selector, { timeout, state: 'hidden' });
  }

  static async clickElement(page: Page, selector: string): Promise<void> {
    await page.click(selector);
  }

  static async fillInput(page: Page, selector: string, value: string): Promise<void> {
    await page.fill(selector, value);
  }

  static async selectOption(page: Page, selector: string, value: string): Promise<void> {
    await page.selectOption(selector, value);
  }

  static async getText(page: Page, selector: string): Promise<string | null> {
    return await page.textContent(selector);
  }

  static async getAttribute(page: Page, selector: string, attribute: string): Promise<string | null> {
    return await page.getAttribute(selector, attribute);
  }

  static async isVisible(page: Page, selector: string): Promise<boolean> {
    return await page.isVisible(selector);
  }

  static async isEnabled(page: Page, selector: string): Promise<boolean> {
    return await page.isEnabled(selector);
  }

  static async isDisabled(page: Page, selector: string): Promise<boolean> {
    return await page.isDisabled(selector);
  }

  static async countElements(page: Page, selector: string): Promise<number> {
    return await page.locator(selector).count();
  }

  static async waitForNavigation(page: Page, url?: string): Promise<void> {
    if (url) {
      await page.waitForURL(url);
    } else {
      await page.waitForLoadState('networkidle');
    }
  }

  static async takeScreenshot(page: Page, filename: string): Promise<void> {
    await page.screenshot({ path: `test-results/screenshots/${filename}`, fullPage: true });
  }

  static async waitForAPIResponse(page: Page, urlPattern: string | RegExp): Promise<void> {
    await page.waitForResponse(urlPattern);
  }

  static async mockAPIResponse(page: Page, url: string, response: any): Promise<void> {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  static async hoverElement(page: Page, selector: string): Promise<void> {
    await page.hover(selector);
  }

  static async scrollToElement(page: Page, selector: string): Promise<void> {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }

  static async pressKey(page: Page, key: string): Promise<void> {
    await page.keyboard.press(key);
  }

  static async typeText(page: Page, selector: string, text: string, delay: number = 100): Promise<void> {
    await page.type(selector, text, { delay });
  }

  static async clearInput(page: Page, selector: string): Promise<void> {
    await page.fill(selector, '');
  }

  static async checkCheckbox(page: Page, selector: string): Promise<void> {
    await page.check(selector);
  }

  static async uncheckCheckbox(page: Page, selector: string): Promise<void> {
    await page.uncheck(selector);
  }

  static async uploadFile(page: Page, selector: string, filePath: string): Promise<void> {
    await page.setInputFiles(selector, filePath);
  }

  static async waitForToast(page: Page, message: string): Promise<void> {
    const toastSelector = `[data-testid="toast"]`;
    await this.waitForElement(page, toastSelector);
    
    const toastMessage = await this.getText(page, toastSelector);
    expect(toastMessage).toContain(message);
  }

  static async waitForErrorMessage(page: Page, message: string): Promise<void> {
    const errorSelector = `[data-testid="error-message"]`;
    await this.waitForElement(page, errorSelector);
    
    const errorMessage = await this.getText(page, errorSelector);
    expect(errorMessage).toContain(message);
  }

  static async waitForSuccessMessage(page: Page, message: string): Promise<void> {
    const successSelector = `[data-testid="success-message"]`;
    await this.waitForElement(page, successSelector);
    
    const successMessage = await this.getText(page, successSelector);
    expect(successMessage).toContain(message);
  }

  static async verifyPageTitle(page: Page, expectedTitle: string): Promise<void> {
    const title = await page.title();
    expect(title).toContain(expectedTitle);
  }

  static async verifyUrlContains(page: Page, expectedPath: string): Promise<void> {
    const url = page.url();
    expect(url).toContain(expectedPath);
  }

  static async verifyElementText(page: Page, selector: string, expectedText: string): Promise<void> {
    const text = await this.getText(page, selector);
    expect(text).toContain(expectedText);
  }

  static async verifyElementExists(page: Page, selector: string): Promise<void> {
    const element = page.locator(selector);
    await expect(element).toHaveCount(1);
  }

  static async verifyElementNotExists(page: Page, selector: string): Promise<void> {
    const element = page.locator(selector);
    await expect(element).toHaveCount(0);
  }

  static async generateRandomString(length: number = 10): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async generateRandomEmail(): Promise<string> {
    const randomString = await this.generateRandomString(8);
    return `test${randomString}@example.com`;
  }

  static async generateRandomPassword(): Promise<string> {
    const randomString = await this.generateRandomString(12);
    return `${randomString}123!`;
  }

  static async setViewportSize(page: Page, width: number, height: number): Promise<void> {
    await page.setViewportSize({ width, height });
  }

  static async isMobileViewport(page: Page): Promise<boolean> {
    const viewportSize = page.viewportSize();
    return viewportSize ? viewportSize.width < 768 : false;
  }

  static async isTabletViewport(page: Page): Promise<boolean> {
    const viewportSize = page.viewportSize();
    return viewportSize ? viewportSize.width >= 768 && viewportSize.width < 1024 : false;
  }

  static async isDesktopViewport(page: Page): Promise<boolean> {
    const viewportSize = page.viewportSize();
    return viewportSize ? viewportSize.width >= 1024 : false;
  }
}
