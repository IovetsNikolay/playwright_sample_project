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
