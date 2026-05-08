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
