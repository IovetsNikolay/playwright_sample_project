# API Error Types Design

## Goal

Replace console-based failure reporting with dedicated typed errors that carry all relevant debug info in their message. Keep successful request logging unchanged.

## What changes

| File | Change |
|------|--------|
| `api/errors.ts` | NEW — `ApiStatusError`, `ApiPollTimeoutError` |
| `api/RequestLogger.ts` | Remove `logFailure`, `buildCurl`, `shellEscape`; keep only `.log()` |
| `api/ApiClient.ts` | `validateStatus` throws `ApiStatusError`; `runPoll` throws `ApiPollTimeoutError` |
| `api/types.ts` | No change |
| `tests/RequestLogger.spec.ts` | DELETE |
| `tests/api-logging.spec.ts` | DELETE |

## Error classes (`api/errors.ts`)

### `ApiStatusError extends Error`

Thrown by `validateStatus` when the response status does not match the configured assertion.

Constructor receives: `meta: RequestMeta`, `status: number`, `assertion: StatusAssertion`, `responseBody: string`

Formatted message:
```
✗ Status assertion failed
  POST https://api.example.com/users [422] 134ms  (expected 201)

Request headers:
  Accept: application/json
  Authorization: Bearer ***

Request body:
  {"email":"foo@bar.com"}

Response body:
  {"message":"Unprocessable Entity"}
```

Expected status line uses `exact` assertion code or `min–max` range depending on assertion type.

### `ApiPollTimeoutError extends Error`

Thrown by `runPoll` when the deadline is exceeded before the predicate returns true.

Constructor receives: `meta: RequestMeta`, `timeout: number`, `lastStatus: number`, `lastBody: string`

Formatted message:
```
✗ Polling timed out after 30000ms
  GET https://api.example.com/orders/123

Last response: [202]
  {"status":"pending"}
```

## RequestLogger after change

```ts
export class RequestLogger {
  static log(meta: RequestMeta, status: number): void {
    const duration = Date.now() - meta.startedAt;
    console.log(`→ ${meta.method} ${meta.url} [${status}] ${duration}ms`);
  }
}
```

`logFailure`, `buildCurl`, and `shellEscape` are deleted entirely.

## ApiClient changes

### `validateStatus`

```ts
if (!isValid) {
  throw new ApiStatusError(meta, status, assertion, await response.text());
}
```

Removes the two-step `logFailure` + `expect()` pattern. The `import { expect }` from Playwright is no longer needed.

### `runPoll`

Three tracking variables (`lastMeta`, `lastStatus`, `lastBody`) capture the most recent attempt's context. On deadline:

```ts
throw new ApiPollTimeoutError(lastMeta, timeout, lastStatus, lastBody);
```

`lastBody` is populated as `await response.text()` for raw polling and `JSON.stringify(body)` for body polling, since the body is already parsed in the body-polling path.

## What is removed

- `RequestLogger.logFailure()` — formatting responsibility moves into error classes
- `buildCurl()` and `shellEscape()` — curl reproduction removed; test code is the authoritative way to reproduce a request
- Playwright `expect()` assertions in `validateStatus` — replaced by `throw ApiStatusError`
- All dedicated logging tests (`RequestLogger.spec.ts`, `api-logging.spec.ts`) — error behavior is exercised by existing integration tests

## What is kept

- `RequestLogger.log()` — one-line success log per request, unchanged
- `RequestMeta`, `StatusAssertion` types — used by error constructors
