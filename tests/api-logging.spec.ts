import { test, expect } from '@playwright/test';
import { ApiClient } from '../api/ApiClient';

function captureLogs(target: 'log' | 'error'): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const original = console[target];
  console[target] = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  return { lines, restore: () => { (console[target] as unknown) = original; } };
}

test.describe.configure({ mode: 'serial' });

test.describe('ApiClient logging', () => {
  test('ApiClient logs brief line for each successful request', async () => {
    const { lines, restore } = captureLogs('log');
    try {
      const client = new ApiClient();
      await client.products.list();
      expect(
        lines.some(l => /^→ GET https:\/\/api\.practicesoftwaretesting\.com\/products \[200\] \d+ms$/.test(l))
      ).toBe(true);
    } finally {
      restore();
    }
  });

  test('ApiClient logs failure block with curl when status assertion fails', async () => {
    const { lines, restore } = captureLogs('error');
    try {
      const client = new ApiClient();
      try {
        await client.assertStatusCode(201).get({ endpoint: '/products' });
      } catch {
        // expected — status assertion throws
      }
      const output = lines.join('\n');
      expect(output).toContain('✗ Request failed');
      expect(output).toContain('curl -X GET');
      expect(output).toContain('https://api.practicesoftwaretesting.com/products');
    } finally {
      restore();
    }
  });

  test('ApiClient includes Authorization header in curl when authenticated', async () => {
    const { lines, restore } = captureLogs('error');
    try {
      const client = new ApiClient().withBearerToken('test-token-123');
      try {
        await client.assertStatusCode(201).get({ endpoint: '/products' });
      } catch {
        // expected
      }
      expect(lines.join('\n')).toContain("Authorization: Bearer test-token-123");
    } finally {
      restore();
    }
  });
});
