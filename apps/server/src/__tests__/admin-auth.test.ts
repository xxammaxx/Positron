import { describe, it, expect } from 'vitest';
import { createAdminAuth } from '../http/admin-auth.js';

describe('createAdminAuth', () => {
  it('should return 503 when admin token is undefined', () => {
    const auth = createAdminAuth(undefined);
    const json = { called: false, body: {} as any };
    const res = {
      status: (code: number) => ({
        json: (body: any) => { json.called = true; json.body = body; },
      }),
    };
    auth({ headers: {} } as any, res as any, () => {});
    expect(json.called).toBe(true);
    expect(json.body.error).toContain('disabled');
  });

  it('should return 401 when token does not match', () => {
    const auth = createAdminAuth('valid-token');
    const json = { called: false, body: {} as any, statusCode: 0 };
    const res = {
      status: (code: number) => {
        json.statusCode = code;
        return { json: (body: any) => { json.called = true; json.body = body; } };
      },
    };
    auth({ headers: { 'x-admin-token': 'wrong-token' } } as any, res as any, () => {});
    expect(json.called).toBe(true);
    expect(json.statusCode).toBe(401);
  });

  it('should call next() when token matches', () => {
    const auth = createAdminAuth('valid-token');
    let nextCalled = false;
    const res = {
      status: () => ({ json: () => {} }),
    };
    auth({ headers: { 'x-admin-token': 'valid-token' } } as any, res as any, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});
