import { step } from 'annotations/step';
import { BaseComponent } from '../base/BaseComponent';
import { ComponentList } from '../base/ComponentList';
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class MainPage extends BasePage {

  protected readonly url = '/';
  private banner = this.page.locator('img[alt="Banner"]');
  private productCards = ComponentList.of(ProductCard, this.page.locator("[class='card']"));

  @step()
  async expectLoaded() {
      await expect(this.banner).toBeVisible();
    } 
  
  @step()
  async getDisplayedCards(): Promise<ProductCard[]>{
    return await this.productCards.all();
  }

  @step()
  async getCardsByPredicate(predicate: (card: ProductCard) => Promise<boolean>): Promise<ProductCard[]> {
    return this.productCards.filter(predicate);
  }

}

class ProductCard extends BaseComponent {
  private productName = this.locator('[data-test="product-name"]');
  private productPrice = this.locator('[data-test="product-price"]');

  @step()
  async getName(): Promise<string> {
    return this.productName.innerText();
  }

  @step()
  async getPrice(): Promise<string> {
    return this.productPrice.innerText();
  }
}