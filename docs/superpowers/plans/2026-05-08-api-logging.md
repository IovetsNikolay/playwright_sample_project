# API Client Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two-level console logging to `ApiClient` — a brief line per request and a full failure block (with curl) when a status assertion fails.

**Architecture:** A new `RequestMeta` type captures method, URL (with query string), headers, body, and start time before each HTTP call. `rawRequest` returns `{ response, meta }` instead of `response` alone; `execute` and `runPoll` destructure it and call `RequestLogger.log` after every response; `validateStatus` (now async) calls `RequestLogger.logFailure` before throwing on bad status.

**Tech Stack:** TypeScript, `@playwright/test`, Node.js `console.log` / `console.error`

---

## Task 1: Add `RequestMeta` to `api/types.ts`

**Files:**
- Modify: `api/types.ts`

- [ ] **Step 1: Add the type**

Append to the bottom of `api/types.ts`:

```typescript
export type RequestMeta = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  startedAt: number;
};
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add api/types.ts
git commit -m "feat: add RequestMeta type for logging"
```

---

## Task 2: Create `api/RequestLogger.ts` (TDD)

**Files:**
- Create: `tests/RequestLogger.spec.ts`
- Create: `api/RequestLogger.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/RequestLogger.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { RequestLogger } from '../api/RequestLogger';
import { RequestMeta } from '../api/types';

function captureLogs(target: 'log' | 'error'): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const original = console[target];
  console[target] = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  return { lines, restore: () => { (console[target] as unknown) = original; } };
}

const baseMeta = (): RequestMeta => ({
  method: 'GET',
  url: 'https://api.example.com/products',
  headers: { Accept: 'application/json' },
  startedAt: Date.now() - 150,
});

test('RequestLogger.log outputs brief line with method, url, status, duration', () => {
  const { lines, restore } = captureLogs('log');
  RequestLogger.log(baseMeta(), 200);
  restore();
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatch(/^→ GET https:\/\/api\.example\.com\/products \[200\] \d+ms$/);
});

test('RequestLogger.logFailure outputs failure block containing key sections', () => {
  const { lines, restore } = captureLogs('error');
  RequestLogger.logFailure(baseMeta(), 400, '{"message":"Bad Request"}');
  restore();
  const output = lines.join('\n');
  expect(output).toContain('✗ Request failed');
  expect(output).toContain('GET https://api.example.com/products [400]');
  expect(output).toContain('{"message":"Bad Request"}');
  expect(output).toContain("curl -X GET 'https://api.example.com/products'");
});

test('RequestLogger.logFailure curl includes -d flag and Content-Type for requests with body', () => {
  const { lines, restore } = captureLogs('error');
  const meta: RequestMeta = {
    ...baseMeta(),
    method: 'POST',
    url: 'https://api.example.com/products',
    body: { name: 'Widget' },
  };
  RequestLogger.logFailure(meta, 422, '{"error":"invalid"}');
  restore();
  const output = lines.join('\n');
  expect(output).toContain("-H 'Content-Type: application/json'");
  expect(output).toContain('-d \'{"name":"Widget"}\'');
});

test('RequestLogger.logFailure curl omits -d flag when no body', () => {
  const { lines, restore } = captureLogs('error');
  RequestLogger.logFailure(baseMeta(), 404, 'Not Found');
  restore();
  expect(lines.join('\n')).not.toContain('-d ');
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx playwright test tests/RequestLogger.spec.ts
```

Expected: 4 failures — `RequestLogger` module not found.

- [ ] **Step 3: Implement `api/RequestLogger.ts`**

Create `api/RequestLogger.ts`:

```typescript
import { RequestMeta } from './types';

export class RequestLogger {
  static log(meta: RequestMeta, status: number): void {
    const duration = Date.now() - meta.startedAt;
    console.log(`→ ${meta.method} ${meta.url} [${status}] ${duration}ms`);
  }

  static logFailure(meta: RequestMeta, status: number, responseBody: string): void {
    const duration = Date.now() - meta.startedAt;
    const parts: string[] = [
      `\n✗ Request failed`,
      `  ${meta.method} ${meta.url} [${status}] ${duration}ms`,
      `\nRequest headers:`,
      ...Object.entries(meta.headers).map(([k, v]) => `  ${k}: ${v}`),
    ];
    if (meta.body !== undefined) {
      parts.push(`\nRequest body:\n  ${JSON.stringify(meta.body)}`);
    }
    parts.push(`\nResponse body:\n  ${responseBody}`);
    parts.push(`\nCurl:\n  ${buildCurl(meta)}`);
    console.error(parts.join('\n'));
  }
}

function buildCurl(meta: RequestMeta): string {
  const headerFlags = Object.entries(meta.headers)
    .map(([k, v]) => `-H '${k}: ${v}'`)
    .join(' \\\n    ');
  const base = `curl -X ${meta.method} '${meta.url}' \\\n    ${headerFlags}`;
  if (meta.body !== undefined) {
    return `${base} \\\n    -H 'Content-Type: application/json' \\\n    -d '${JSON.stringify(meta.body)}'`;
  }
  return base;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx playwright test tests/RequestLogger.spec.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add api/RequestLogger.ts tests/RequestLogger.spec.ts
git commit -m "feat: add RequestLogger with brief and failure log formatting"
```

---

## Task 3: Wire logging into `ApiClient` (TDD)

**Files:**
- Create: `tests/api-logging.spec.ts`
- Modify: `api/ApiClient.ts`

- [ ] **Step 1: Write the failing integration tests**

Create `tests/api-logging.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { ApiClient } from '../api/ApiClient';

function captureLogs(target: 'log' | 'error'): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const original = console[target];
  console[target] = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  return { lines, restore: () => { (console[target] as unknown) = original; } };
}

test('ApiClient logs brief line for each successful request', async () => {
  const { lines, restore } = captureLogs('log');
  const client = new ApiClient();
  await client.products.list();
  restore();
  expect(
    lines.some(l => /^→ GET https:\/\/api\.practicesoftwaretesting\.com\/products \[200\] \d+ms$/.test(l))
  ).toBe(true);
});

test('ApiClient logs failure block with curl when status assertion fails', async () => {
  const { lines, restore } = captureLogs('error');
  const client = new ApiClient();
  try {
    await client.assertStatusCode(201).get({ endpoint: '/products' });
  } catch {
    // expected — status assertion throws
  }
  restore();
  const output = lines.join('\n');
  expect(output).toContain('✗ Request failed');
  expect(output).toContain('curl -X GET');
  expect(output).toContain('https://api.practicesoftwaretesting.com/products');
});

test('ApiClient includes Authorization header in curl when authenticated', async () => {
  const { lines, restore } = captureLogs('error');
  const client = new ApiClient().withBearerToken('test-token-123');
  try {
    await client.assertStatusCode(201).get({ endpoint: '/products' });
  } catch {
    // expected
  }
  restore();
  expect(lines.join('\n')).toContain("Authorization: Bearer test-token-123");
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx playwright test tests/api-logging.spec.ts
```

Expected: 3 failures — no logging output produced yet.

- [ ] **Step 3: Add import and `buildUrlWithParams` helper to `ApiClient.ts`**

At the top of `api/ApiClient.ts`, add the import for `RequestLogger` and `RequestMeta`:

```typescript
import { RequestLogger } from './RequestLogger';
```

Add `RequestMeta` to the existing import from `./types`:

```typescript
import {
  RequestOptions, PollOptions, IApiContext,
  StatusAssertion, PollConfig, RequestConfig, RequestMeta,
} from './types';
```

Add this module-level helper function directly above the `ApiClient` class declaration:

```typescript
function buildUrlWithParams(url: string, params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) return url;
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  return `${url}?${qs}`;
}
```

- [ ] **Step 4: Replace `rawRequest` in `ApiClient.ts`**

Replace the existing `rawRequest` method (lines 123–136) with:

```typescript
private async rawRequest(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  options: RequestOptions,
): Promise<{ response: APIResponse; meta: RequestMeta }> {
  await this.ensureInitialized();
  const startedAt = Date.now();
  const baseUrl = `${this.baseURL}${options.endpoint}`;
  const url = buildUrlWithParams(baseUrl, options.queryParams);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (this.bearerToken) headers['Authorization'] = `Bearer ${this.bearerToken}`;
  const meta: RequestMeta = { method: method.toUpperCase(), url, headers, body: options.body, startedAt };
  const ctx = this.apiContext!;
  const response = await (() => {
    switch (method) {
      case 'get':    return ctx.get(baseUrl,    { params: options.queryParams });
      case 'post':   return ctx.post(baseUrl,   { data: options.body });
      case 'put':    return ctx.put(baseUrl,    { data: options.body });
      case 'patch':  return ctx.patch(baseUrl,  { data: options.body });
      case 'delete': return ctx.delete(baseUrl, { params: options.queryParams });
    }
  })();
  return { response, meta };
}
```

- [ ] **Step 5: Replace `execute` in `ApiClient.ts`**

Replace the existing `execute` method (lines 138–146) with:

```typescript
private async execute<T>(
  fn: () => Promise<{ response: APIResponse; meta: RequestMeta }>,
  deserialize?: true,
): Promise<APIResponse | T> {
  if (this.config.pollConfig) return this.runPoll<T>(fn, deserialize);
  const { response, meta } = await fn();
  RequestLogger.log(meta, response.status());
  await this.validateStatus(response, meta);
  return deserialize ? (await response.json()) as T : response;
}
```

- [ ] **Step 6: Replace `runPoll` in `ApiClient.ts`**

Replace the existing `runPoll` method (lines 148–174) with:

```typescript
private async runPoll<T>(
  fn: () => Promise<{ response: APIResponse; meta: RequestMeta }>,
  deserialize?: true,
): Promise<APIResponse | T> {
  const { interval, timeout, type, predicate } = this.config.pollConfig!;
  const deadline = Date.now() + timeout;

  while (true) {
    const { response, meta } = await fn();
    RequestLogger.log(meta, response.status());

    if (type === 'raw') {
      if (await predicate(response)) {
        await this.validateStatus(response, meta);
        return deserialize ? response.json() as T : response;
      }
    } else {
      const body = await response.json() as T;
      if (await predicate(body)) {
        await this.validateStatus(response, meta);
        return body;
      }
    }

    if (Date.now() > deadline) throw new Error(`Polling timed out after ${timeout}ms`);
    await new Promise<void>(resolve => setTimeout(resolve, interval));
  }
}
```

- [ ] **Step 7: Replace `validateStatus` in `ApiClient.ts`**

Replace the existing `validateStatus` method (lines 176–185) with:

```typescript
private async validateStatus(response: APIResponse, meta: RequestMeta): Promise<void> {
  const status = response.status();
  const { assertion } = this.config;
  const isValid = assertion.type === 'exact'
    ? status === assertion.code
    : status >= assertion.min && status <= assertion.max;

  if (!isValid) {
    const body = await response.text();
    RequestLogger.logFailure(meta, status, body);
  }

  if (assertion.type === 'exact') {
    expect(status, `Expected status ${assertion.code}, got ${status}`).toBe(assertion.code);
  } else {
    expect(status, `Expected status ${assertion.min}–${assertion.max}, got ${status}`).toBeGreaterThanOrEqual(assertion.min);
    expect(status, `Expected status ${assertion.min}–${assertion.max}, got ${status}`).toBeLessThanOrEqual(assertion.max);
  }
}
```

- [ ] **Step 8: Compile check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Run integration tests to confirm they pass**

```bash
npx playwright test tests/api-logging.spec.ts
```

Expected: 3 passed.

- [ ] **Step 10: Run full test suite to confirm no regressions**

```bash
npx playwright test
```

Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
git add api/ApiClient.ts tests/api-logging.spec.ts
git commit -m "feat: wire RequestLogger into ApiClient request/failure lifecycle"
```
