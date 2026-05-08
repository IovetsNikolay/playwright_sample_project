# API Client Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse `ApiClient`, `RequestContext`, and `ServiceRegistry` into a single `ApiClient` class while preserving the exact calling interface.

**Architecture:** `ApiClient` absorbs all logic from `RequestContext` (assertion + polling) and `ServiceRegistry` (service getters). Modifier methods (`assertStatusCode`, `pollUntil`, `pollUntilBody`) use a shallow-clone pattern — returning a copy of the client with new per-request config — so chaining works without mutating the original. All types move to `types.ts`. Services depend on the new `IApiContext` interface (defined in `types.ts`) rather than importing `ApiClient` directly, which prevents a circular import (`ApiClient → services → ApiClient`).

**Tech Stack:** TypeScript, Playwright (`@playwright/test` ^1.59.1)

---

## File Map

| Action | File |
|--------|------|
| Modify | `api/types.ts` |
| Rewrite | `api/ApiClient.ts` |
| Modify | `api/services/LoginService.ts` |
| Modify | `api/services/ProductsService.ts` |
| Delete | `api/RequestContext.ts` |
| Delete | `api/ServiceRegistry.ts` |

---

### Task 1: Update `types.ts`

Add all type definitions here. `IApiContext` is the interface services depend on — it carries the typed deserialize overloads services need, and breaks the circular import that would result from services importing `ApiClient` directly. `IHttpClient` is removed (it existed only to support the old `RequestContext → ApiClient` delegation).

**Files:**
- Modify: `api/types.ts`

- [ ] **Step 1: Replace the contents of `api/types.ts`**

```ts
import { APIResponse } from 'playwright';

export interface RequestOptions {
  endpoint: string;
  queryParams?: Record<string, string | number | boolean>;
  body?: any;
}

export interface PollOptions {
  /** How long to wait between attempts. Default: 1000ms */
  interval?: number;
  /** Maximum total wait time before throwing. Default: 30_000ms */
  timeout?: number;
}

/** What services depend on — implemented by ApiClient. */
export interface IApiContext {
  get(opts: RequestOptions): Promise<APIResponse>;
  get<T>(opts: RequestOptions, deserialize: true): Promise<T>;
  post(opts: RequestOptions): Promise<APIResponse>;
  post<T>(opts: RequestOptions, deserialize: true): Promise<T>;
  put(opts: RequestOptions): Promise<APIResponse>;
  put<T>(opts: RequestOptions, deserialize: true): Promise<T>;
  patch(opts: RequestOptions): Promise<APIResponse>;
  patch<T>(opts: RequestOptions, deserialize: true): Promise<T>;
  delete(opts: RequestOptions): Promise<APIResponse>;
  delete<T>(opts: RequestOptions, deserialize: true): Promise<T>;
}

export type StatusAssertion =
  | { type: 'range'; min: number; max: number }
  | { type: 'exact'; code: number };

export type PollConfig = {
  interval: number;
  timeout: number;
} & (
  | { type: 'raw';  predicate: (res: APIResponse) => boolean | Promise<boolean> }
  | { type: 'body'; predicate: (body: unknown)    => boolean | Promise<boolean> }
);

export type RequestConfig = {
  assertion: StatusAssertion;
  pollConfig?: PollConfig;
};
```

- [ ] **Step 2: Verify the file saved correctly**

```bash
cat api/types.ts
```

Expected: file shows `RequestOptions`, `PollOptions`, `IApiContext`, `StatusAssertion`, `PollConfig`, `RequestConfig` — no `IHttpClient`.

---

### Task 2: Rewrite `ApiClient.ts`

Single class that owns auth state, raw HTTP, per-request config, assertion/polling logic, and service getters. Modifier methods return a shallow clone (`Object.create` + `Object.assign`) with new per-request config. The Playwright `apiContext` is shared across clones once initialized (auth is set up on the root client before any cloning, so clones inherit the initialized context via shallow copy).

**Files:**
- Rewrite: `api/ApiClient.ts`

- [ ] **Step 1: Replace the contents of `api/ApiClient.ts`**

```ts
import { request as playwrightRequest, APIRequestContext, APIResponse } from 'playwright';
import { expect } from '@playwright/test';
import {
  RequestOptions, PollOptions, IApiContext,
  StatusAssertion, PollConfig, RequestConfig,
} from './types';
import { ProductsService } from './services/ProductsService';
import { LoginService } from './services/LoginService';
import { TokenResponse } from './dto/UserDto';

export class ApiClient implements IApiContext {
  private email?: string;
  private password?: string;
  private bearerToken?: string;
  private apiContext?: APIRequestContext;
  private config: RequestConfig = { assertion: { type: 'range', min: 200, max: 299 } };

  constructor(private readonly baseURL = 'https://api.practicesoftwaretesting.com') {}

  // ── Auth ────────────────────────────────────────────────────────────────────

  withCredentials(email: string, password: string): this {
    this.email = email;
    this.password = password;
    return this;
  }

  withBearerToken(token: string): this {
    this.bearerToken = token;
    return this;
  }

  // ── Per-request modifiers ────────────────────────────────────────────────────
  // Each returns a shallow clone with new config — original is never mutated.
  // Call auth setup (withCredentials / withBearerToken) before any modifier so
  // clones inherit auth state and share the same apiContext once initialized.

  assertStatusCode(code: number): this {
    return this.clone({ assertion: { type: 'exact', code } });
  }

  pollUntil(
    predicate: (response: APIResponse) => boolean | Promise<boolean>,
    options?: PollOptions,
  ): this {
    return this.clone({
      pollConfig: {
        type: 'raw',
        predicate,
        interval: options?.interval ?? 1_000,
        timeout:  options?.timeout  ?? 30_000,
      },
    });
  }

  pollUntilBody<T>(
    predicate: (body: T) => boolean | Promise<boolean>,
    options?: PollOptions,
  ): this {
    return this.clone({
      pollConfig: {
        type: 'body',
        predicate: predicate as (body: unknown) => boolean | Promise<boolean>,
        interval: options?.interval ?? 1_000,
        timeout:  options?.timeout  ?? 30_000,
      },
    });
  }

  // ── Services ─────────────────────────────────────────────────────────────────

  get products(): ProductsService { return new ProductsService(this); }
  get auth():     LoginService    { return new LoginService(this); }

  // ── HTTP (called by services; assertion + polling applied here) ──────────────

  async get(options: RequestOptions): Promise<APIResponse>;
  async get<T>(options: RequestOptions, deserialize: true): Promise<T>;
  async get<T>(options: RequestOptions, deserialize?: true): Promise<APIResponse | T> {
    return this.execute(() => this.rawRequest('get', options), deserialize);
  }

  async post(options: RequestOptions): Promise<APIResponse>;
  async post<T>(options: RequestOptions, deserialize: true): Promise<T>;
  async post<T>(options: RequestOptions, deserialize?: true): Promise<APIResponse | T> {
    return this.execute(() => this.rawRequest('post', options), deserialize);
  }

  async put(options: RequestOptions): Promise<APIResponse>;
  async put<T>(options: RequestOptions, deserialize: true): Promise<T>;
  async put<T>(options: RequestOptions, deserialize?: true): Promise<APIResponse | T> {
    return this.execute(() => this.rawRequest('put', options), deserialize);
  }

  async patch(options: RequestOptions): Promise<APIResponse>;
  async patch<T>(options: RequestOptions, deserialize: true): Promise<T>;
  async patch<T>(options: RequestOptions, deserialize?: true): Promise<APIResponse | T> {
    return this.execute(() => this.rawRequest('patch', options), deserialize);
  }

  async delete(options: RequestOptions): Promise<APIResponse>;
  async delete<T>(options: RequestOptions, deserialize: true): Promise<T>;
  async delete<T>(options: RequestOptions, deserialize?: true): Promise<APIResponse | T> {
    return this.execute(() => this.rawRequest('delete', options), deserialize);
  }

  async dispose(): Promise<void> {
    await this.apiContext?.dispose();
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private clone(patch: { assertion?: StatusAssertion; pollConfig?: PollConfig }): this {
    const copy = Object.create(Object.getPrototypeOf(this)) as this;
    Object.assign(copy, this);
    copy.config = {
      assertion: patch.assertion ?? this.config.assertion,
      pollConfig: patch.pollConfig ?? this.config.pollConfig,
    };
    return copy;
  }

  private async rawRequest(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    options: RequestOptions,
  ): Promise<APIResponse> {
    await this.ensureInitialized();
    const url = `${this.baseURL}${options.endpoint}`;
    switch (method) {
      case 'get':    return this.apiContext!.get(url,    { params: options.queryParams });
      case 'post':   return this.apiContext!.post(url,   { data: options.body });
      case 'put':    return this.apiContext!.put(url,    { data: options.body });
      case 'patch':  return this.apiContext!.patch(url,  { data: options.body });
      case 'delete': return this.apiContext!.delete(url, { params: options.queryParams });
    }
  }

  private async execute<T>(
    fn: () => Promise<APIResponse>,
    deserialize?: true,
  ): Promise<APIResponse | T> {
    if (this.config.pollConfig) return this.runPoll<T>(fn, deserialize);
    const response = await fn();
    this.validateStatus(response);
    return deserialize ? response.json() as T : response;
  }

  private async runPoll<T>(
    fn: () => Promise<APIResponse>,
    deserialize?: true,
  ): Promise<APIResponse | T> {
    const { interval, timeout, type, predicate } = this.config.pollConfig!;
    const deadline = Date.now() + timeout;

    while (true) {
      const response = await fn();

      if (type === 'raw') {
        if (await predicate(response)) {
          this.validateStatus(response);
          return deserialize ? response.json() as T : response;
        }
      } else {
        const body = await response.json() as T;
        if (await predicate(body)) {
          this.validateStatus(response);
          return body;
        }
      }

      if (Date.now() > deadline) throw new Error(`Polling timed out after ${timeout}ms`);
      await new Promise<void>(resolve => setTimeout(resolve, interval));
    }
  }

  private validateStatus(response: APIResponse): void {
    const status = response.status();
    const { assertion } = this.config;
    if (assertion.type === 'exact') {
      expect(status, `Expected status ${assertion.code}, got ${status}`).toBe(assertion.code);
    } else {
      expect(status, `Expected status ${assertion.min}–${assertion.max}, got ${status}`).toBeGreaterThanOrEqual(assertion.min);
      expect(status, `Expected status ${assertion.min}–${assertion.max}, got ${status}`).toBeLessThanOrEqual(assertion.max);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.apiContext) return;

    if (this.email && this.password && !this.bearerToken) {
      const tempContext = await playwrightRequest.newContext({ baseURL: this.baseURL });
      const response = await tempContext.post(`${this.baseURL}/users/login`, {
        data: { email: this.email, password: this.password },
        headers: { Accept: 'application/json' },
      });
      const body: TokenResponse = await response.json();
      this.bearerToken = body.access_token;
      await tempContext.dispose();
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.bearerToken) headers['Authorization'] = `Bearer ${this.bearerToken}`;

    this.apiContext = await playwrightRequest.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: headers,
    });
  }
}
```

- [ ] **Step 2: Verify line count**

```bash
wc -l api/ApiClient.ts
```

Expected: ~160 lines.

---

### Task 3: Update services to use `IApiContext`

Services import `IApiContext` from `../types` instead of `RequestContext` from `../RequestContext`. The method calls are identical — only the constructor parameter type changes.

**Files:**
- Modify: `api/services/LoginService.ts`
- Modify: `api/services/ProductsService.ts`

- [ ] **Step 1: Replace `api/services/LoginService.ts`**

```ts
import { APIResponse } from 'playwright';
import { IApiContext } from '../types';
import { LoginRequest } from '../dto/UserDto';

export class LoginService {
  constructor(private readonly context: IApiContext) {}

  login(body: LoginRequest): Promise<APIResponse> {
    return this.context.post({ endpoint: '/users/login', body });
  }

  logout(): Promise<APIResponse> {
    return this.context.get({ endpoint: '/users/logout' });
  }

  refresh(): Promise<APIResponse> {
    return this.context.get({ endpoint: '/users/refresh' });
  }
}
```

- [ ] **Step 2: Replace `api/services/ProductsService.ts`**

```ts
import { APIResponse } from 'playwright';
import { IApiContext } from '../types';
import {
  ProductRequest,
  PartialProductRequest,
  ProductResponse,
  PaginatedProductResponse,
  ProductListParams,
  ProductSearchParams,
  ProductSpecResponse,
  ProductSpecRequest,
} from '../dto/ProductDto';

export class ProductsService {
  constructor(private readonly context: IApiContext) {}

  list(params?: ProductListParams): Promise<PaginatedProductResponse> {
    return this.context.get<PaginatedProductResponse>(
      { endpoint: '/products', queryParams: params as Record<string, string | number | boolean> },
      true,
    );
  }

  getById(productId: string): Promise<ProductResponse> {
    return this.context.get<ProductResponse>({ endpoint: `/products/${productId}` }, true);
  }

  create(body: ProductRequest): Promise<ProductResponse> {
    return this.context.post<ProductResponse>({ endpoint: '/products', body }, true);
  }

  update(productId: string, body: ProductRequest): Promise<APIResponse> {
    return this.context.put({ endpoint: `/products/${productId}`, body });
  }

  patch(productId: string, body: PartialProductRequest): Promise<APIResponse> {
    return this.context.patch({ endpoint: `/products/${productId}`, body });
  }

  delete(productId: string): Promise<APIResponse> {
    return this.context.delete({ endpoint: `/products/${productId}` });
  }

  search(params: ProductSearchParams): Promise<PaginatedProductResponse> {
    return this.context.get<PaginatedProductResponse>(
      { endpoint: '/products/search', queryParams: params as Record<string, string | number | boolean> },
      true,
    );
  }

  getRelated(productId: string): Promise<ProductResponse[]> {
    return this.context.get<ProductResponse[]>({ endpoint: `/products/${productId}/related` }, true);
  }

  getSpecs(productId: string): Promise<ProductSpecResponse[]> {
    return this.context.get<ProductSpecResponse[]>({ endpoint: `/products/${productId}/specs` }, true);
  }

  getSpec(productId: string, specId: string): Promise<ProductSpecResponse> {
    return this.context.get<ProductSpecResponse>(
      { endpoint: `/products/${productId}/specs/${specId}` },
      true,
    );
  }

  addSpec(productId: string, body: ProductSpecRequest): Promise<ProductSpecResponse> {
    return this.context.post<ProductSpecResponse>({ endpoint: `/products/${productId}/specs`, body }, true);
  }

  updateSpec(productId: string, specId: string, body: Partial<ProductSpecRequest>): Promise<APIResponse> {
    return this.context.put({ endpoint: `/products/${productId}/specs/${specId}`, body });
  }

  deleteSpec(productId: string, specId: string): Promise<APIResponse> {
    return this.context.delete({ endpoint: `/products/${productId}/specs/${specId}` });
  }
}
```

---

### Task 4: Delete obsolete files

`RequestContext.ts` and `ServiceRegistry.ts` are fully replaced. Nothing imports them after Tasks 1–3.

**Files:**
- Delete: `api/RequestContext.ts`
- Delete: `api/ServiceRegistry.ts`

- [ ] **Step 1: Delete both files**

```bash
rm api/RequestContext.ts api/ServiceRegistry.ts
```

- [ ] **Step 2: Confirm deletion**

```bash
ls api/
```

Expected:
```
ApiClient.ts  dto/  services/  types.ts
```

---

### Task 5: Verify TypeScript compilation

No standalone `tsconfig.json` — Playwright's built-in TypeScript compiler is the type-checker. `--list` parses all test files and their transitive imports without running any tests.

- [ ] **Step 1: Run type-check via Playwright**

```bash
npx playwright test --list 2>&1
```

Expected: test names printed, no `error TS` lines. If you see TypeScript errors, they will look like `error TS2345: Argument of type ...` — fix before proceeding.

- [ ] **Step 2: Confirm final `api/` structure**

```bash
ls api/ && ls api/services/ && ls api/dto/
```

Expected:
```
ApiClient.ts  dto/  services/  types.ts
LoginService.ts  ProductsService.ts
ProductDto.ts  UserDto.ts
```
