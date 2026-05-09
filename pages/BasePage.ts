import {type Page} from '@playwright/test'
import { step } from 'annotations/step';

export abstract class BasePage {
    constructor(protected readonly page: Page) {}
    protected abstract readonly url: string;
    abstract expectLoaded(): Promise<void>;

    @step()
    async open(): Promise<void> {
        await this.page.goto(this.url);
    }
}