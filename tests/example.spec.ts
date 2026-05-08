import { test } from '../fixtures/pages';
import { ApiClient } from '../api/ApiClient';
import { generateRegistrationData } from '../dto/RegistrationDto';

test('positive login flow', async ({ pages }) => {

  const user = generateRegistrationData();
  await pages.registrationPage.open();

  await pages.registrationPage.registerUser(user);

  await pages.loginPage.expectLoaded();
  await pages.loginPage.login(user.email, user.password);
  await pages.accountPage.expectLoaded();

  const client = new ApiClient().withCredentials(user.email, user.password);
  const response = await client.assertStatusCode(400).products.list();
  console.log();
});
