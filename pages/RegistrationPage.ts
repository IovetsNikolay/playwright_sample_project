import { BasePage } from './BasePage';
import { expect } from '@playwright/test';
import { RegistrationDto } from '../dto/RegistrationDto';
import { step } from 'annotations/step';

export class RegistrationPage extends BasePage {

    protected readonly url  = '/auth/register';
    private pageTitle       = this.page.locator('.container h3');
    private firstNameInput  = this.page.locator('input#first_name');
    private lastNameInput   = this.page.locator('input#last_name');
    private dobInput        = this.page.locator('input#dob');
    private countrySelect   = this.page.locator('select#country');
    private postalCodeInput = this.page.locator('input#postal_code');
    private houseNumberInput = this.page.locator('input#house_number');
    private streetInput = this.page.locator('input#street');
    private cityInput = this.page.locator('input#city');
    private stateInput      = this.page.locator('input#state');
    private phoneInput      = this.page.locator('input#phone');
    private emailInput      = this.page.locator('input#email');
    private passwordInput   = this.page.locator('input#password');
    private submitBtn       = this.page.locator('[data-test="register-submit"]');

    @step()
    async expectLoaded(): Promise<void> {
        await expect(this.pageTitle).toContainText('Customer registration');
    }

    @step()
    async registerUser(dto: RegistrationDto): Promise<void> {
        await this.firstNameInput.fill(dto.firstName);
        await this.lastNameInput.fill(dto.lastName);
        await this.dobInput.fill(dto.dateOfBirth);
        const availableCountries = await this.countrySelect.locator('option').allTextContents();
        console.log(`Selecting country: "${dto.country}"`);
        // console.log(`Available options: ${JSON.stringify(availableCountries)}`);
        await this.countrySelect.selectOption({ label: dto.country });
        await this.postalCodeInput.fill(dto.postalCode);
        await this.houseNumberInput.fill(dto.houseNumber);
        await this.streetInput.fill(dto.street);
        await this.cityInput.fill(dto.city);
        await this.stateInput.fill(dto.state);
        await this.phoneInput.fill(dto.phone);
        await this.emailInput.fill(dto.email);
        await this.passwordInput.fill(dto.password);
        await this.submitBtn.click();
    }
}