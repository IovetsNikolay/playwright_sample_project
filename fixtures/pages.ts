import {test as base} from '@playwright/test'
import { PageManager } from '../pages/PageManager'

type PagesFixture = {
    pages: PageManager
}

export const test = base.extend<PagesFixture>( {
    pages: async ({ page }, use) => {
        const pagesManager = new PageManager(page);
        await use(pagesManager);
    }
} )

export { expect } from '@playwright/test';