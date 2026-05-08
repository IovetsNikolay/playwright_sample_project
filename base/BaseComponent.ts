import { type Locator, expect } from '@playwright/test';

type ComponentConstructor<T extends BaseComponent> = new (
  locator: Locator
) => T;
export abstract class BaseComponent {
  constructor(public readonly root: Locator) {}

  protected get page() {
    return this.root.page();
  }

  protected locator(selector: string) {
    return this.root.locator(selector);
  }

  protected getByRole(...args: Parameters<Locator['getByRole']>) {
    return this.root.getByRole(...args);
  }

  protected getByText(...args: Parameters<Locator['getByText']>) {
    return this.root.getByText(...args);
  }

  protected getByLabel(...args: Parameters<Locator['getByLabel']>) {
    return this.root.getByLabel(...args);
  }

  protected getByTestId(testId: string | RegExp) {
    return this.root.getByTestId(testId);
  }

  protected getByPlaceholder(...args: Parameters<Locator['getByPlaceholder']>) {
    return this.root.getByPlaceholder(...args);
  }

  /** Asserts the component is visible. Override for richer checks. */
  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  /**
   * * Factory method: creates a typed component from a Playwright Locator.
   * * Usage: `Select.from(page.getByRole('combobox', { name: '...' }))`
   * */
  static from<T extends BaseComponent>(
    this: ComponentConstructor<T>,
    locator: Locator
  ): T {
    return new this(locator);
  }
}
