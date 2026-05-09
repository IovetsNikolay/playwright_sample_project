# API Error Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `console.error` failure reporting with typed errors (`ApiStatusError`, `ApiPollTimeoutError`) that carry all debug info in their message.

**Architecture:** Create `api/errors.ts` with two self-contained error classes that format their own messages. Simplify `RequestLogger` to success-only logging. Update `ApiClient` to throw the new errors instead of calling `logFailure` + `expect()`. Delete all dedicated logging tests.

**Tech Stack:** TypeScript, Playwright (`APIResponse`, `APIRequestContext`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `api/errors.ts` | CREATE | `ApiStatusError`, `ApiPollTimeoutError` — format message in constructor |
| `api/RequestLogger.ts` | MODIFY | Remove `logFailure`, `buildCurl`, `shellEscape`; keep only `.log()` |
| `api/ApiClient.ts` | MODIFY | `validateStatus` throws `ApiStatusError`; `runPoll` throws `ApiPollTimeoutError` |
| `tests/RequestLogger.spec.ts` | DELETE | All logging unit tests removed |
| `tests/api-logging.spec.ts` | DELETE | All logging integration tests removed |

---

### Task 1: Create `api/errors.ts`

**Files:**
- Create: `api/errors.ts`

- [ ] **Step 1: Create the file with both error classes**

```typescript
import { RequestMeta, StatusAssertion } from './types';

export class ApiStatusError extends Error {
  constructor(meta: RequestMeta, status: number, assertion: StatusAssertion, responseBody: string) {
    const duration = Date.now() - meta.startedAt;
    const expected = assertion.type === 'exact'
      ? `${assertion.code}`
      : `${assertion.min}–${assertion.max}`;
    const parts: string[] = [
      `\n✗ Status assertion failed`,
      `  ${meta.method} ${meta.url} [${status}] ${duration}ms  (expected ${expected})`,
      `\nRequest headers:`,
      ...Object.entries(meta.headers).map(([k, v]) => `  ${k}: ${v}`),
    ];
    if (meta.body !== undefined) {
      parts.push(`\nRequest body:\n  ${JSON.stringify(meta.body)}`);
    }
    parts.push(`\nResponse body:\n  ${responseBody}`);
    super(parts.join('\n'));
    this.name = 'ApiStatusError';
  }
}

export class ApiPollTimeoutError extends Error {
  constructor(meta: RequestMeta, timeout: number, lastStatus: number, lastBody: string) {
    super([
      `\n✗ Polling timed out after ${timeout}ms`,
      `  ${meta.method} ${meta.url}`,
      `\nLast response: [${lastStatus}]`,
      `  ${lastBody}`,
    ].join('\n'));
    this.name = 'ApiPollTimeoutError';
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add api/errors.ts
git commit -m "feat: add ApiStatusError and ApiPollTimeoutError"
```

---

### Task 2: Simplify `api/RequestLogger.ts`

**Files:**
- Modify: `api/RequestLogger.ts`

- [ ] **Step 1: Replace the entire file content**

```typescript
import { RequestMeta } from './types';

export class RequestLogger {
  static log(meta: RequestMeta, status: number): void {
    const duration = Date.now() - meta.startedAt;
    console.log(`→ ${meta.method} ${meta.url} [${status}] ${duration}ms`);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (there will be errors from `ApiClient.ts` still referencing `logFailure` — that's fine, fixed in Task 3).

- [ ] **Step 3: Commit**

```bash
git add api/RequestLogger.ts
git commit -m "refactor: remove logFailure, buildCurl, shellEscape from RequestLogger"
```

---

### Task 3: Update `api/ApiClient.ts` — imports and `validateStatus`

**Files:**
- Modify: `api/ApiClient.ts`

- [ ] **Step 1: Update imports at the top of `ApiClient.ts`**

Remove:
```typescript
import { expect } from '@playwright/test';
```

Add (after the existing imports):
```typescript
import { ApiStatusError, ApiPollTimeoutError } from './errors';
```

The imports block should look like:

```typescript
import { request as playwrightRequest, APIRequestContext, APIResponse } from 'playwright';
import {
  RequestOptions, PollOptions, IApiContext,
  StatusAssertion, PollConfig, RequestConfig, RequestMeta,
} from './types';
import { ProductsService } from './services/ProductsService';
import { LoginService } from './services/LoginService';
import { TokenResponse } from './dto/UserDto';
import { RequestLogger } from './RequestLogger';
import { ApiStatusError, ApiPollTimeoutError } from './errors';
```

- [ ] **Step 2: Replace `validateStatus` method**

Find and replace the entire `validateStatus` method (currently lines 196–214):

```typescript
private async validateStatus(response: APIResponse, meta: RequestMeta): Promise<void> {
  const status = response.status();
  const { assertion } = this.config;
  const isValid = assertion.type === 'exact'
    ? status === assertion.code
    : status >= assertion.min && status <= assertion.max;

  if (!isValid) {
    throw new ApiStatusError(meta, status, assertion, await response.text());
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add api/ApiClient.ts
git commit -m "refactor: throw ApiStatusError in validateStatus, remove expect() assertions"
```

---

### Task 4: Update `api/ApiClient.ts` — `runPoll`

**Files:**
- Modify: `api/ApiClient.ts`

- [ ] **Step 1: Replace `runPoll` method**

Find and replace the entire `runPoll` method (currently lines 167–194):

```typescript
private async runPoll<T>(
  fn: () => Promise<{ response: APIResponse; meta: RequestMeta }>,
  deserialize?: true,
): Promise<APIResponse | T> {
  const { interval, timeout, type, predicate } = this.config.pollConfig!;
  const deadline = Date.now() + timeout;
  let lastMeta!: RequestMeta;
  let lastStatus!: number;
  let lastBody = '';

  while (true) {
    const { response, meta } = await fn();
    lastMeta = meta;
    lastStatus = response.status();
    RequestLogger.log(meta, lastStatus);

    if (type === 'raw') {
      lastBody = await response.text();
      if (await predicate(response)) {
        await this.validateStatus(response, meta);
        return deserialize ? (await response.json()) as T : response;
      }
    } else {
      const body = await response.json() as T;
      lastBody = JSON.stringify(body);
      if (await predicate(body)) {
        await this.validateStatus(response, meta);
        return body;
      }
    }

    if (Date.now() > deadline) throw new ApiPollTimeoutError(lastMeta, timeout, lastStatus, lastBody);
    await new Promise<void>(resolve => setTimeout(resolve, interval));
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: clean output, no errors.

- [ ] **Step 3: Commit**

```bash
git add api/ApiClient.ts
git commit -m "refactor: throw ApiPollTimeoutError with last response in runPoll"
```

---

### Task 5: Delete logging test files

**Files:**
- Delete: `tests/RequestLogger.spec.ts`
- Delete: `tests/api-logging.spec.ts`

- [ ] **Step 1: Delete both files**

```bash
rm tests/RequestLogger.spec.ts tests/api-logging.spec.ts
```

- [ ] **Step 2: Verify remaining tests compile and run**

```bash
npx playwright test tests/example.spec.ts --project=chromium
```

Expected: test runs (pass or fail is fine — the suite hits a real API and requires a running browser env). No TypeScript or import errors.

- [ ] **Step 3: Commit**

```bash
git add -u tests/RequestLogger.spec.ts tests/api-logging.spec.ts
git commit -m "test: remove dedicated logging tests"
```

---

### Task 6: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: clean, no errors.

- [ ] **Step 2: Confirm no remaining references to removed symbols**

```bash
grep -r "logFailure\|buildCurl\|shellEscape" api/ tests/
```

Expected: no output.

- [ ] **Step 3: Confirm error classes are exported and used correctly**

```bash
grep -r "ApiStatusError\|ApiPollTimeoutError" api/
```

Expected: defined in `api/errors.ts`, imported and used in `api/ApiClient.ts`.
