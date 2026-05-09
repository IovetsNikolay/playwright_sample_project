import { skipIfWebkit } from "utils/testSkipper";
import { test } from "../fixtures/base";
import { Tag } from "utils/tags";

test.describe("Main Flow", { tag: [Tag.UI, Tag.API] }, () => {
  skipIfWebkit("WebKit has issues with this feature");
  test("positive login flow", async ({ pages, user, apiClient }) => {
    await pages.registrationPage.open();
    await pages.registrationPage.registerUser(user);

    await pages.loginPage.expectLoaded();
    await pages.loginPage.login(user.email, user.password);
    await pages.accountPage.expectLoaded();
    const response = await apiClient.products.list();

    // ── Polling variants — uncomment one at a time ─────────────────────────────

    // 1. pollUntil — raw response predicate, succeeds on first attempt (200 always matches)
    // await apiClient
    //   .pollUntil(r => r.status() === 200)
    //   .products.list();

    // 2. pollUntil with custom interval/timeout — same as #1, explicit timing
    // await apiClient
    //   .pollUntil(r => r.status() === 200, { interval: 500, timeout: 3_000 })
    //   .products.list();

    // 3. pollUntil — predicate never true → throws ApiPollTimeoutError after 2 s (2 attempts)
    // await apiClient
    //   .pollUntil(r => r.status() === 404, { interval: 1_000, timeout: 2_000 })
    //   .products.list();

    // 4. pollUntil — predicate matches 200, but assertStatusCode(404) → throws ApiStatusError
    // await apiClient
    //   .assertStatusCode(404)
    //   .pollUntil(r => r.status() === 200)
    //   .products.list();

    // 5. pollUntilBody — body predicate, succeeds on first attempt when products exist
    // await apiClient
    //   .pollUntilBody<PaginatedProductResponse>(body => body.total > 0)
    //   .products.list();

    // 6. pollUntilBody with custom interval/timeout — same as #5, explicit timing
    // await apiClient
    //   .pollUntilBody<PaginatedProductResponse>(body => body.data.length > 0, { interval: 500, timeout: 3_000 })
    //   .products.list();

    // 7. pollUntilBody — predicate never true → throws ApiPollTimeoutError after 2 s (2 attempts)
    // await apiClient
    //   .pollUntilBody<PaginatedProductResponse>(body => body.total === 0, { interval: 1_000, timeout: 2_000 })
    //   .products.list();

    // 8. pollUntilBody + assertStatusCode — exact 200 assertion, succeeds on first attempt
    // await apiClient
    //   .assertStatusCode(200)
    //   .pollUntilBody<PaginatedProductResponse>(body => body.total === 0)
    //   .products.list();
  });
});
