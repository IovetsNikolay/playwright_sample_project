import { Page } from '@playwright/test'
import { LoginPage } from './LoginPage';
import { AccountPage } from './AccountPage';
import { RegistrationPage } from './RegistrationPage';

export class PageManager{
    readonly page: Page;
    private _pages = new Map<string, any>();

    constructor(page: Page){
        this.page = page;
    }

    private getLazy<T>(key: string, factory: () => T): T {
        if (!this._pages.has(key)) {
        this._pages.set(key, factory());
        }
        return this._pages.get(key) as T;
    }

    get loginPage(): LoginPage {
        return this.getLazy('loginPage', () => new LoginPage(this.page))
    } 

    get accountPage(): AccountPage {
        return this.getLazy('accountPage', () => new AccountPage(this.page))
    } 

    get registrationPage(): RegistrationPage {
        return this.getLazy('registrationPage', () => new RegistrationPage(this.page))
    }

}