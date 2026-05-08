# API Client Logging Design

**Date:** 2026-05-08  
**Status:** Approved

## Goal

Add two levels of console logging to `ApiClient`:

1. **Brief log** on every request (success or failure) — method, full URL, status code, duration.
2. **Full failure log** when a status assertion fails — request headers, request body, response body, and a ready-to-use curl command.

## Data Model

New `RequestMeta` type added to `api/types.ts`:

```typescript
export type RequestMeta = {
  method: string;                     // uppercase: 'GET', 'POST', …
  url: string;                        // full URL with query string appended
  headers: Record<string, string>;    // Accept + Authorization if present
  body?: unknown;                     // request body (POST/PUT/PATCH only)
  startedAt: number;                  // Date.now() captured before the call
};
```

`rawRequest` builds `RequestMeta` before making the Playwright call, then returns `{ response, meta }` instead of `response` alone.

## New File: `api/RequestLogger.ts`

Owns all formatting logic. Two public static methods:

### `log(meta, status)`

Printed after every HTTP response:

```
→ GET https://api.practicesoftwaretesting.com/products [200] 142ms
```

### `logFailure(meta, status, responseBody)`

Printed before `validateStatus` fires its `expect()` assertion:

```
✗ Request failed
  GET https://api.practicesoftwaretesting.com/products [400] 38ms

Request headers:
  Accept: application/json
  Authorization: Bearer eyJ...

Response body:
  {"message":"Bad Request"}

Curl:
  curl -X GET 'https://api.practicesoftwaretesting.com/products' \
    -H 'Accept: application/json' \
    -H 'Authorization: Bearer eyJ...'
```

A private `buildCurl(meta)` function in the same file assembles the shell command:
- Always: `-X METHOD 'url'` + one `-H` per header
- POST/PUT/PATCH with body: adds `-H 'Content-Type: application/json'` + `-d '<json>'`

## Changes to `ApiClient`

### `rawRequest`

- Captures `startedAt = Date.now()` before the Playwright call
- Reconstructs headers from `this.bearerToken` (matching what `ensureInitialized` sets)
- Builds the full URL string including serialised query params (for the curl)
- Returns `{ response: APIResponse; meta: RequestMeta }`

### `execute` and `runPoll`

- Destructure `{ response, meta }` from `rawRequest`
- Call `RequestLogger.log(meta, response.status())` after each response
- Pass `meta` into `validateStatus`

### `validateStatus`

- Becomes `async`
- Accepts `meta: RequestMeta` as second parameter
- Reads `await response.text()` before asserting
- Calls `RequestLogger.logFailure(meta, status, responseBody)` before the `expect()` throws

## Scope

- No changes to `IApiContext`, service classes, or public `ApiClient` API
- Callers are fully unaffected
- Brief log fires on every poll attempt; failure log fires only when `validateStatus` is invoked
