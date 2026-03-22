import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { errorHandler } from '../../../src/server/middleware/errorHandler.js';

describe('errorHandler Middleware', () => {
  let mockRes: any;
  let mockReq: any;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      headersSent: false,
      statusCode: 500,
    };
    mockReq = { method: 'POST', url: '/api/test' };
  });

  afterEach(() => {
    if (originalEnv) { process.env.NODE_ENV = originalEnv; }
    else { delete process.env.NODE_ENV; }
  });

  describe('Stack Trace Visibility', () => {
    it('hides stack trace even in development mode (Sentinel Hardening)', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('Dev mode error') as any;
      err.stack = 'Error: Dev mode error\n    at someFunction (file.ts:10:5)';
      errorHandler(err, mockReq, mockRes, vi.fn());
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });

    it('hides stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('Prod mode error') as any;
      err.stack = 'Error: Prod mode error\n    at someFunction (file.ts:10:5)';
      errorHandler(err, mockReq, mockRes, vi.fn());
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });

    it('returns generic message in production', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('Sensitive internal error');
      errorHandler(err, mockReq, mockRes, vi.fn());
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error).toContain('tidepool disturbance');
    });
  });

  describe('Security Scenarios', () => {
    it('handles duplicate key attempt (409)', () => {
      const err = new Error('UNIQUE constraint failed: agent_keys.api_key');
      errorHandler(err, mockReq, mockRes, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('handles unknown errors as 500', () => {
      const err = new Error('Unexpected crash');
      errorHandler(err, mockReq, mockRes, vi.fn());
      expect(mockRes.status).toHaveBeenCalledWith(500);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
    });
  });
});
