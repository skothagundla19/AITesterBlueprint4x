import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/Login.page';

const LOGIN_URL = 'https://login.salesforce.com/?locale=in';
const VALID_USERNAME = 'sudheer';
const VALID_PASSWORD = '123';

test.describe('Salesforce Login Page', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto(LOGIN_URL);
      await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
      const outcome = await loginPage.waitForLoginOutcome(10000);
      expect(outcome).toBe('success');
    } catch (error) {
      throw new Error(`Valid login test failed: ${(error as Error).message}`);
    }
  });

  test('should show error message with invalid password', async ({ page }) => {
    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto(LOGIN_URL);
      await loginPage.login('invalid.user@example.com', 'WrongPassword123!');
      const outcome = await loginPage.waitForLoginOutcome(10000);
      expect(outcome).toBe('error');
      await expect(await loginPage.isErrorMessageVisible()).toBeTruthy();
      await expect(await loginPage.getErrorMessageText()).not.toBe('');
    } catch (error) {
      throw new Error(`Invalid login test failed: ${(error as Error).message}`);
    }
  });
});
