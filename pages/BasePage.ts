import {type Page} from '@playwright/test'

export abstract class BasePage {
    constructor(protected readonly page: Page) {}
    protected abstract readonly url: string;
    abstract expectLoaded(): Promise<void>;

    async open(): Promise<void> {
        await this.page.goto(this.url);
    }
}