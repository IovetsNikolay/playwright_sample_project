import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AccountPage extends BasePage{

  protected readonly url = '/account';
  private pageTitle = this.page.locator('[data-test="page-title"]');

  async expectLoaded() {
    await expect(this.pageTitle).toContainText('My account');
  } 
    
}