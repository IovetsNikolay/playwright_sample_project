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
