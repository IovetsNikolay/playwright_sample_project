import { RequestMeta } from './types';

export class RequestLogger {
  static log(meta: RequestMeta, status: number): void {
    const duration = Date.now() - meta.startedAt;
    console.log(`→ ${meta.method} ${meta.url} [${status}] ${duration}ms`);
  }
}
