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

const shellEscape = (s: string) => s.replace(/'/g, `'\\''`);

function buildCurl(meta: RequestMeta): string {
  const headerFlags = Object.entries(meta.headers)
    .map(([k, v]) => `-H '${k}: ${shellEscape(v)}'`)
    .join(' \\\n    ');
  const base = headerFlags.length > 0
    ? `curl -X ${meta.method} '${shellEscape(meta.url)}' \\\n    ${headerFlags}`
    : `curl -X ${meta.method} '${shellEscape(meta.url)}'`;
  if (meta.body !== undefined) {
    const parts = [base];
    const ctAlreadySet = Object.keys(meta.headers)
      .some(k => k.toLowerCase() === 'content-type');
    if (!ctAlreadySet) {
      parts.push(`-H 'Content-Type: application/json'`);
    }
    parts.push(`-d '${shellEscape(JSON.stringify(meta.body))}'`);
    return parts.join(' \\\n    ');
  }
  return base;
}
