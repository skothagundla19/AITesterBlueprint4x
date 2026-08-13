Role -> You are a QA automation tester with 15 years of experience, You have a very good understanding of IT, CRM projects like [salesforce.com](https://salesforce.com/). You need to create a framework with Playwright with typescript and it should be enterprise-level framework that we need to create.

I  -> Instructions

- Generate a Complete playwright with typescript automation script following the standard of enterprise level standards.
- Automate and verify the results of the login page [login.salesforce.com/?locale=in](https://login.salesforce.com/?locale=in), ensure that UI is thoroughly tested with valid and invalid testcases.
- [Critical] Implement robust exception handling within both Page Object model and test scripts using structured try–catch blocks or explicit exception signatures. 
- [Mandatory] Use Page Object Model including constructor initialization, and reusable action methods. 
- [Mandatory] - It is important that Use id and name as first priority.
Use XPath only when id/name are unavailable or unstable.
- [Output] - - Output only runnable code, no explanations, comments, dependencies, or extra text. 
- [Don't] - Don't use the css selectors, ID, name and others things.
- [Don't] - Don't add comments, Thread.sleep and other bad coding practice.
- [Generate] - Generate the 2 scripts only with the valid and invalid testcases of the login page.
- [Don't Use] Thread.sleep() anywhere; rely on WebDriverWait or implicit waits. 
- Maintain a consistent structure, readability, and modularity across all generated scripts.




C -> Context
You are creating a login page scripts with proper framework for the sales force login, which is a AB Testing website with valid and invalid login page where in the login page you have the email, password and submit button with remember me functionality. 



**E -> Example**
Example structure for PageFactory:

import { Page, expect } from '@playwright/test';
  export class LoginPage {
    async isLoginFormVisible() {
    return this.page.locator('div').filter({ hasText: 'User NamePassword Log In' }).first().isVisible();
  }

  async expectLoginFormVisible() {
    await expect(this.page.locator('div').filter({ hasText: 'User NamePassword Log In' }).first()).toBeVisible();
  }
    private page: Page;

    constructor(page: Page) {
      this.page = page;
    }

    async logout() {
      await this.page.locator('.mat-tooltip-trigger').first().click();
    }

  async goto() {
    await this.page.goto('http://10.100.6.107/greenmailer/#/login?');
  }

  async enterUsername(username: string) {
    await this.page.getByRole('textbox', { name: 'User Name' }).waitFor({ state: 'visible', timeout: 60000 });
    await this.page.getByRole('textbox', { name: 'User Name' }).fill(username);
  }

  async enterPassword(password: string) {
    await this.page.getByRole('textbox', { name: 'Password' }).waitFor({ state: 'visible', timeout: 60000 });
    await this.page.getByRole('textbox', { name: 'Password' }).fill(password);
  }

  async clickLogin() {
    await this.page.getByRole('button', { name: 'Log In' }).click();
  }



**P -> PARAMETERS**
with production level automation script expert with pin point accuracy and almost zero bad coding practice. 

-  I have external URLs, external staging URLs. I will give you the external username and password as well 


O -> Output
Provide only: 

- 1 Login.spec.ts 
- 2 Login.page.ts
- No explanations or additional content.


T -> Tone 
Technical, precisely, enterprise-grade, code-one.

