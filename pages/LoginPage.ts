import { step } from 'annotations/step';
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class LoginPage extends BasePage {

  protected readonly url = '/auth/login';
  private pageTitle = this.page.locator('.container h3');
  private emailInput = this.page.locator('#email');
  private passwordInput = this.page.locator('#password');
  private submitBtn = this.page.locator('[data-test="login-submit"]');

  @step()
  async expectLoaded() {
      await expect(this.pageTitle).toContainText('Login');
    } 
  
  @step()
  async login(email: string, password: string){
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  } 
    
}