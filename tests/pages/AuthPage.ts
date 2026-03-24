import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly registerTab: Locator;
  readonly loginTab: Locator;
  readonly nameInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.locator('[data-testid="login-submit-btn"]');
    this.registerTab = page.locator('[data-testid="register-tab"]');
    this.loginTab = page.locator('[data-testid="login-tab"]');
    this.nameInput = page.locator('input[name="name"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
  }

  async navigateToAuth(): Promise<void> {
    await this.navigateTo('/auth');
  }

  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
  }

  async fillRegistrationForm(name: string, email: string, password: string, confirmPassword: string): Promise<void> {
    await this.clickElement(this.registerTab);
    await this.fillInput(this.nameInput, name);
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.fillInput(this.confirmPasswordInput, confirmPassword);
  }

  async clickLogin(): Promise<void> {
    await this.clickElement(this.loginButton);
  }

  async clickRegister(): Promise<void> {
    await this.clickElement(this.loginButton);
  }

  async switchToLoginTab(): Promise<void> {
    await this.clickElement(this.loginTab);
  }

  async switchToRegisterTab(): Promise<void> {
    await this.clickElement(this.registerTab);
  }

  async getErrorMessage(): Promise<string | null> {
    return await this.errorMessage.textContent();
  }

  async getSuccessMessage(): Promise<string | null> {
    return await this.successMessage.textContent();
  }

  async verifyLoginFormVisible(): Promise<boolean> {
    const emailVisible = await this.verifyElementVisible(this.emailInput);
    const passwordVisible = await this.verifyElementVisible(this.passwordInput);
    const loginBtnVisible = await this.verifyElementVisible(this.loginButton);
    return emailVisible && passwordVisible && loginBtnVisible;
  }

  async verifyRegistrationFormVisible(): Promise<boolean> {
    const nameVisible = await this.verifyElementVisible(this.nameInput);
    const emailVisible = await this.verifyElementVisible(this.emailInput);
    const passwordVisible = await this.verifyElementVisible(this.passwordInput);
    const confirmVisible = await this.verifyElementVisible(this.confirmPasswordInput);
    return nameVisible && emailVisible && passwordVisible && confirmVisible;
  }
}
