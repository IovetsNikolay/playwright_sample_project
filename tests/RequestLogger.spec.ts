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
  try {
    RequestLogger.log(baseMeta(), 200);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^→ GET https:\/\/api\.example\.com\/products \[200\] \d+ms$/);
  } finally {
    restore();
  }
});

test('RequestLogger.logFailure outputs failure block containing key sections', () => {
  const { lines, restore } = captureLogs('error');
  try {
    RequestLogger.logFailure(baseMeta(), 400, '{"message":"Bad Request"}');
    const output = lines.join('\n');
    expect(output).toContain('✗ Request failed');
    expect(output).toContain('GET https://api.example.com/products [400]');
    expect(output).toContain('{"message":"Bad Request"}');
    expect(output).toContain("curl -X GET 'https://api.example.com/products'");
  } finally {
    restore();
  }
});

test('RequestLogger.logFailure curl includes -d flag and Content-Type for requests with body', () => {
  const { lines, restore } = captureLogs('error');
  try {
    const meta: RequestMeta = {
      ...baseMeta(),
      method: 'POST',
      url: 'https://api.example.com/products',
      body: { name: 'Widget' },
    };
    RequestLogger.logFailure(meta, 422, '{"error":"invalid"}');
    const output = lines.join('\n');
    expect(output).toContain("-H 'Content-Type: application/json'");
    expect(output).toContain('-d \'{"name":"Widget"}\'');
    expect(output).toContain('Request body:');
    expect(output).toContain('{"name":"Widget"}');
  } finally {
    restore();
  }
});

test('RequestLogger.logFailure curl omits -d flag when no body', () => {
  const { lines, restore } = captureLogs('error');
  try {
    RequestLogger.logFailure(baseMeta(), 404, 'Not Found');
    expect(lines.join('\n')).not.toContain('-d ');
  } finally {
    restore();
  }
});

test('RequestLogger.logFailure curl does not duplicate Content-Type when already in headers', () => {
  const { lines, restore } = captureLogs('error');
  try {
    const meta: RequestMeta = {
      ...baseMeta(),
      method: 'POST',
      url: 'https://api.example.com/products',
      headers: { 'Content-Type': 'application/json' },
      body: { x: 1 },
    };
    RequestLogger.logFailure(meta, 400, '');
    const output = lines.join('\n');
    const matches = (output.match(/-H 'Content-Type:/g) ?? []).length;
    expect(matches).toBe(1);
  } finally {
    restore();
  }
});

test('RequestLogger.logFailure curl shell-escapes single quotes in URL', () => {
  const { lines, restore } = captureLogs('error');
  try {
    const meta: RequestMeta = {
      ...baseMeta(),
      url: "https://api.example.com/search?q=it's",
    };
    RequestLogger.logFailure(meta, 400, 'not found');
    const output = lines.join('\n');
    expect(output).toContain("curl -X GET 'https://api.example.com/search?q=it'\\''s'");
  } finally {
    restore();
  }
});
