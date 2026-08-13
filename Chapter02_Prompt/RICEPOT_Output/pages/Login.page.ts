import { Locator, Page } from '@playwright/test';

export class LoginPage {
  private readonly page: Page;
  private readonly defaultTimeout = 30000;

  constructor(page: Page) {
    this.page = page;
  }

  private get usernamePrimary() {
    return this.page.locator("xpath=//input[@id='username' and @type='email']");
  }

  private get usernameFallback() {
    return this.page.locator("xpath=//input[@name='username' and @autocomplete='username']");
  }

  private get passwordPrimary() {
    return this.page.locator("xpath=//input[@id='password' and @type='password']");
  }

  private get passwordFallback() {
    return this.page.locator("xpath=//input[@name='pw' and @type='password']");
  }

  private get loginPrimary() {
    return this.page.locator("xpath=//input[@id='Login' and @type='submit' and @value='Log In']");
  }

  private get loginFallback() {
    return this.page.locator("xpath=//form[contains(@id,'login') or @name='login']//input[@type='submit'][contains(@value,'Log In')]");
  }

  private get rememberPrimary() {
    return this.page.locator("xpath=//input[@id='rememberUn' and @type='checkbox']");
  }

  private get rememberFallback() {
    return this.page.locator("xpath=//input[@name='rememberUn' and @type='checkbox']");
  }

  private get errorMessage() {
    return this.page.locator("xpath=//div[@id='error' and contains(@class,'loginError')]");
  }

  private get loginFormRoot() {
    return this.page.locator("xpath=//form[contains(@id,'login') or @name='login']");
  }

  private async getActiveLocator(operation: string, locators: Locator[]): Promise<Locator> {
    for (const locator of locators) {
      if ((await locator.count()) > 0) {
        return locator;
      }
    }
    throw new Error(`No element found for operation: ${operation}`);
  }

  private async getUsernameInput() {
    return this.getActiveLocator('username input', [
      this.usernamePrimary,
      this.usernameFallback,
    ]);
  }

  private async getPasswordInput() {
    return this.getActiveLocator('password input', [
      this.passwordPrimary,
      this.passwordFallback,
    ]);
  }

  private async getLoginButton() {
    return this.getActiveLocator('login button', [
      this.loginPrimary,
      this.loginFallback,
    ]);
  }

  private async getRememberMeCheckbox() {
    return this.getActiveLocator('remember me checkbox', [
      this.rememberPrimary,
      this.rememberFallback,
    ]);
  }

  async goto(url: string): Promise<void> {
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      const usernameInput = await this.getUsernameInput();
      await usernameInput.waitFor({ state: 'visible', timeout: this.defaultTimeout });
    } catch (error) {
      throw new Error(`Failed to navigate to login page: ${(error as Error).message}`);
    }
  }

  async enterUsername(username: string): Promise<void> {
    try {
      const usernameInput = await this.getUsernameInput();
      await usernameInput.waitFor({ state: 'visible', timeout: this.defaultTimeout });
      await usernameInput.fill(username);
    } catch (error) {
      throw new Error(`Failed to enter username: ${(error as Error).message}`);
    }
  }

  async enterPassword(password: string): Promise<void> {
    try {
      const passwordInput = await this.getPasswordInput();
      await passwordInput.waitFor({ state: 'visible', timeout: this.defaultTimeout });
      await passwordInput.fill(password);
    } catch (error) {
      throw new Error(`Failed to enter password: ${(error as Error).message}`);
    }
  }

  async toggleRememberMe(): Promise<void> {
    try {
      const rememberMeCheckbox = await this.getRememberMeCheckbox();
      await rememberMeCheckbox.waitFor({ state: 'visible', timeout: this.defaultTimeout });
      await rememberMeCheckbox.check();
    } catch (error) {
      throw new Error(`Failed to toggle remember me: ${(error as Error).message}`);
    }
  }

  async clickLogin(): Promise<void> {
    try {
      const loginButton = await this.getLoginButton();
      await loginButton.waitFor({ state: 'visible', timeout: this.defaultTimeout });
      await loginButton.click();
    } catch (error) {
      throw new Error(`Failed to click login button: ${(error as Error).message}`);
    }
  }

  async login(username: string, password: string): Promise<void> {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLogin();
  }

  async getErrorMessageText(): Promise<string> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: this.defaultTimeout });
      return (await this.errorMessage.textContent()) ?? '';
    } catch (error) {
      throw new Error(`Failed to read error message: ${(error as Error).message}`);
    }
  }

  async isErrorMessageVisible(): Promise<boolean> {
    try {
      return await this.errorMessage.isVisible();
    } catch (error) {
      throw new Error(`Failed to check error message visibility: ${(error as Error).message}`);
    }
  }

  async waitForLoginOutcome(timeoutMs: number = 10000): Promise<'success' | 'error'> {
    try {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const url = this.page.url();
        const onLoginHost = /https:\/\/login\.salesforce\.com\/?/.test(url);
        const onLoginForm = await this.loginFormRoot.count();
        const hasError = await this.errorMessage.count();

        if (hasError > 0 && (await this.errorMessage.isVisible())) {
          return 'error';
        }

        if (!onLoginHost || onLoginForm === 0) {
          return 'success';
        }

        await this.page.waitForTimeout(250);
      }

      return 'error';
    } catch (error) {
      throw new Error(`Failed to determine login outcome: ${(error as Error).message}`);
    }
  }
}
