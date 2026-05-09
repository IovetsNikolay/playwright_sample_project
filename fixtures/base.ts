import { test as base } from '@playwright/test';
import { PageManager } from '../pages/PageManager';
import { ApiClient } from '../api/ApiClient';
import { RegistrationDto, generateRegistrationData } from '../dto/RegistrationDto';

type Fixtures = {
  pages: PageManager;
  user: RegistrationDto;
  apiClient: ApiClient;
};

export const test = base.extend<Fixtures>({
  pages: async ({ page }, use) => {
    await use(new PageManager(page));
  },

  user: async ({}, use) => {
    await use(generateRegistrationData());
  },

  apiClient: async ({ user }, use) => {
    const client = new ApiClient().withCredentials(user.email, user.password);
    await use(client);
    await client.dispose();
  },
});

export { expect } from '@playwright/test';