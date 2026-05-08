import type { Locator } from '@playwright/test';
import type { BaseComponent } from './BaseComponent';

type ComponentConstructor<T extends BaseComponent> = new (
  locator: Locator
) => T;

export class ComponentList<T extends BaseComponent> {
  private constructor(
    private readonly rootLocator: Locator,
    private readonly Component: ComponentConstructor<T>
  ) {}

  /** Lazy -- wraps rootLocator.nth() without resolving the DOM. */
  nth(index: number): T {
    return new this.Component(this.rootLocator.nth(index));
  }

  /** Lazy -- wraps rootLocator.first() without resolving the DOM. */
  first(): T {
    return new this.Component(this.rootLocator.first());
  }

  /** Lazy -- wraps rootLocator.last() without resolving the DOM. */
  last(): T {
    return new this.Component(this.rootLocator.last());
  }

  /** Resolves the current element count. */
  count(): Promise<number> {
    return this.rootLocator.count();
  }

  /**
   * Resolves all currently matching elements into typed components.
   *
   * WARNING: returned components hold resolved locators -- if the DOM changes
   * afterward, they may point to stale/wrong elements.
   * Prefer .nth()/.first()/.last() for actions that should re-query the DOM.
   */
  async all(): Promise<T[]> {
    return (await this.rootLocator.all()).map((loc) => new this.Component(loc));
  }

  /**
   * Resolves all elements then filters by async predicate.
   * Same staleness caveat as .all() applies.
   */
  async filter(predicate: (component: T) => Promise<boolean>): Promise<T[]> {
    const all = await this.all();
    const results: T[] = [];

    for (const comp of all) {
      if (await predicate(comp)) results.push(comp);
    }

    return results;
  }

  /**
   * Factory method: creates a typed component list from a Playwright Locator.
   * Usage: `ComponentList.of(UserCard, page.locator('.user-card'))`
   */
  static of<T extends BaseComponent>(
    Component: ComponentConstructor<T>,
    locator: Locator
  ): ComponentList<T> {
    return new ComponentList(locator, Component);
  }
}
