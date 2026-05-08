import { request as playwrightRequest, APIRequestContext, APIResponse } from 'playwright';
import { expect } from '@playwright/test';
import {
  RequestOptions, PollOptions, IApiContext,
  StatusAssertion, PollConfig, RequestConfig, RequestMeta,
} from './types';
import { ProductsService } from './services/ProductsService';
import { LoginService } from './services/LoginService';
import { TokenResponse } from './dto/UserDto';
import { RequestLogger } from './RequestLogger';

function buildUrlWithParams(url: string, params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) return url;
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  return `${url}?${qs}`;
}

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

  private async ensureInitialized(): Promise<void> {
    if (this.apiContext) return;

    if (this.email && this.password && !this.bearerToken) {
      const tempContext = await playwrightRequest.newContext({ baseURL: this.baseURL });
      const response = await tempContext.post(`${this.baseURL}/users/login`, {
        data: { email: this.email, password: this.password },
        headers: { Accept: 'application/json' },
      });
      if (!response.ok()) {
        throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
      }
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
