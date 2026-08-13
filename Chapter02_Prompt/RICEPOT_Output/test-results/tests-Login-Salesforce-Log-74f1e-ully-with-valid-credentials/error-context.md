# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\Login.spec.ts >> Salesforce Login Page >> should login successfully with valid credentials
- Location: tests\Login.spec.ts:9:7

# Error details

```
Error: Valid login test failed: expect(received).toBe(expected) // Object.is equality

Expected: "success"
Received: "error"
```

# Page snapshot

```yaml
- generic [ref=f3e1]:
  - generic [ref=f3e2]:
    - generic [ref=f3e5]:
      - generic [ref=f3e6]: Salesforce login
      - generic [ref=f3e11]:
        - generic [ref=f3e12]:
          - generic [ref=f3e13]: "Error: Please check your username and password. If you still can't log in, contact your Salesforce administrator."
          - heading "Salesforce login" [level=1] [ref=f3e14]
          - generic [ref=f3e15]:
            - text: Username
            - textbox "Username" [active] [ref=f3e17]
          - text: Password
          - textbox "Password" [ref=f3e18]
          - button "Log In" [ref=f3e19] [cursor=pointer]
          - generic [ref=f3e20]:
            - checkbox "Remember me" [ref=f3e21]
            - generic [ref=f3e22]: Remember me
        - generic [ref=f3e23]:
          - link "Forgot Your Password?" [ref=f3e24] [cursor=pointer]:
            - /url: /secur/forgotpassword.jsp?locale=in&lqs=locale%3Din
          - link "Use Custom Domain" [ref=f3e25] [cursor=pointer]:
            - /url: javascript:void(0);
        - generic [ref=f3e26]: or
        - link "Log In with Email" [ref=f3e27] [cursor=pointer]:
          - /url: https://welcome.salesforce.com?qs=&loginType=&display=page&pw=123&lt=standard&passwordShown=true&locale=in&login=&serverid=&local=&startURL=&pqs=%3Flocale%3Din&oauth_callback=&hasRememberUn=true&loginURL=&oauth_token=&ExtraLog=%255B%257B%2522width%2522%3A1280%257D%2C%257B%2522height%2522%3A720%257D%2C%257B%2522language%2522%3A%2522en-US%2522%257D%2C%257B%2522offset%2522%3A-5.5%257D%2C%257B%2522scripts%2522%3A%255B%257B%2522size%2522%3A249%2C%2522summary%2522%3A%2522if%2520%28self%2520%3D%3D%2520top%29%2520%257Bdocument.documentElement.style.v%2522%257D%2C%257B%2522size%2522%3A571%2C%2522summary%2522%3A%2522var%2520SFDCSessionVars%3D%257B%255C%2522server%255C%2522%3A%255C%2522https%3A%255C%255C%2F%255C%255C%2Flogin.sal%2522%257D%2C%257B%2522url%2522%3A%2522https%3A%2F%2Flogin.salesforce.com%2Fjslibrary%2FSfdcSessionBase208.js%2522%257D%2C%257B%2522url%2522%3A%2522https%3A%2F%2Flogin.salesforce.com%2Fjslibrary%2FLoginHint208.js%2522%257D%2C%257B%2522size%2522%3A26%2C%2522summary%2522%3A%2522LoginHint.hideLoginForm%28%29%3B%2522%257D%2C%257B%2522size%2522%3A36%2C%2522summary%2522%3A%2522LoginHint.getSavedIdentities%28false%29%3B%2522%257D%2C%257B%2522url%2522%3A%2522https%3A%2F%2Flogin.salesforce.com%2Fjslibrary%2Fbaselogin4.js%2522%257D%2C%257B%2522url%2522%3A%2522https%3A%2F%2Flogin.salesforce.com%2Fjslibrary%2FLoginMarketingSurveyResponse.js%2522%257D%2C%257B%2522size%2522%3A454%2C%2522summary%2522%3A%2522function%2520handleLogin%28%29%257Bdocument.login.un.value%3Ddoc%2522%257D%255D%257D%2C%257B%2522scriptCount%2522%3A9%257D%2C%257B%2522iframes%2522%3A%255B%2522https%3A%2F%2Fc.salesforce.com%2Flogin-messages%2Fin%2Fpromos.html%2522%2C%2522https%3A%2F%2Flogin.salesforce.com%2Flogin%2Fsessionserver212.html%2522%255D%257D%2C%257B%2522iframeCount%2522%3A2%257D%2C%257B%2522referrer%2522%3A%2522NO_REFERRER%2522%257D%255D&width=1280&un=sudheer&useSecure=true&height=720&username=sudheer&ref=lsc
      - generic [ref=f3e28]:
        - paragraph [ref=f3e29]: Not a customer?
        - link "Try for Free" [ref=f3e30] [cursor=pointer]:
          - /url: https://www.salesforce.com/in/form/trial/freetrial.jsp?d=70130000000Enyk
    - generic [ref=f3e31]:
      - text: © 2026 Salesforce, Inc. All rights reserved. |
      - link "Privacy" [ref=f3e32] [cursor=pointer]:
        - /url: https://www.salesforce.com/in/company/privacy
  - iframe [ref=f3e34]:
    
  - generic: Login
  - iframe [ref=f3e35]:
    
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { LoginPage } from '../pages/Login.page';
  3  | 
  4  | const LOGIN_URL = 'https://login.salesforce.com/?locale=in';
  5  | const VALID_USERNAME = 'sudheer';
  6  | const VALID_PASSWORD = '123';
  7  | 
  8  | test.describe('Salesforce Login Page', () => {
  9  |   test('should login successfully with valid credentials', async ({ page }) => {
  10 |     try {
  11 |       const loginPage = new LoginPage(page);
  12 |       await loginPage.goto(LOGIN_URL);
  13 |       await loginPage.login(VALID_USERNAME, VALID_PASSWORD);
  14 |       const outcome = await loginPage.waitForLoginOutcome(10000);
  15 |       expect(outcome).toBe('success');
  16 |     } catch (error) {
> 17 |       throw new Error(`Valid login test failed: ${(error as Error).message}`);
     |             ^ Error: Valid login test failed: expect(received).toBe(expected) // Object.is equality
  18 |     }
  19 |   });
  20 | 
  21 |   test('should show error message with invalid password', async ({ page }) => {
  22 |     try {
  23 |       const loginPage = new LoginPage(page);
  24 |       await loginPage.goto(LOGIN_URL);
  25 |       await loginPage.login('invalid.user@example.com', 'WrongPassword123!');
  26 |       const outcome = await loginPage.waitForLoginOutcome(10000);
  27 |       expect(outcome).toBe('error');
  28 |       await expect(await loginPage.isErrorMessageVisible()).toBeTruthy();
  29 |       await expect(await loginPage.getErrorMessageText()).not.toBe('');
  30 |     } catch (error) {
  31 |       throw new Error(`Invalid login test failed: ${(error as Error).message}`);
  32 |     }
  33 |   });
  34 | });
  35 | 
```