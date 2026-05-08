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
