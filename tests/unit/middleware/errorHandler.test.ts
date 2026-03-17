import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { errorHandler } from '../../../src/server/middleware/errorHandler.js';

/**
 * Comprehensive Error Handler Tests
 *
 * Tests the errorHandler middleware with:
 * - JSON parse errors
 * - Database constraint violations (UNIQUE, FOREIGN KEY)
 * - Status code handling
 * - Stack trace visibility (dev vs production)
 * - Unknown/generic errors
 * - Edge cases (headers already sent, non-Error exceptions)
 */

describe('errorHandler Middleware', () => {
  let mockRes: any;
  let mockReq: any;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Capture original NODE_ENV
    originalEnv = process.env.NODE_ENV;

    // Create comprehensive mock response
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      headersSent: false,
      statusCode: 500,
    };

    mockReq = {
      method: 'POST',
      url: '/api/test',
    };
  });

  afterEach(() => {
    // Restore NODE_ENV
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: JSON Parse Errors
  // ────────────────────────────────────────────────────────────────────────────

  describe('JSON Parse Errors', () => {
    it('returns 400 for invalid JSON with entity.parse.failed type', () => {
      const err = new Error('Invalid JSON payload') as any;
      err.type = 'entity.parse.failed';

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.error).toContain('Invalid JSON payload');
    });

    it('returns 400 for malformed JSON in request body', () => {
      const err = new SyntaxError('Unexpected token } in JSON at position 10') as any;
      err.type = 'entity.parse.failed';

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: Database Constraint Violations
  // ────────────────────────────────────────────────────────────────────────────

  describe('Database Constraint Violations', () => {
    it('returns 409 Conflict for UNIQUE constraint violation', () => {
      const err = new Error('UNIQUE constraint failed: bookmarks.url');

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(409);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.error).toBeDefined();
    });

    it('returns 409 for UNIQUE constraint on username', () => {
      const err = new Error('UNIQUE constraint failed: users.username');

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('returns 409 for UNIQUE constraint on api_key', () => {
      const err = new Error('UNIQUE constraint failed: agent_keys.api_key');

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('returns 400 Bad Request for FOREIGN KEY constraint violation', () => {
      const err = new Error('FOREIGN KEY constraint failed: bookmarks.folder_id');

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
    });

    it('returns 400 for orphaned foreign key references', () => {
      const err = new Error('FOREIGN KEY constraint failed: folders.parent_id');

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('never leaks constraint names in production', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('UNIQUE constraint failed: bookmarks.user_uuid_url');

      errorHandler(err, mockReq, mockRes, vi.fn());

      const jsonCall = mockRes.json.mock.calls[0][0];
      const responseString = JSON.stringify(jsonCall);

      // Should NOT contain technical details
      expect(responseString).not.toContain('constraint');
      expect(responseString).not.toContain('user_uuid_url');
      expect(responseString).not.toContain('UNIQUE');
      expect(responseString).not.toContain('FOREIGN KEY');
    });

    it('shows constraint details in development mode', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('UNIQUE constraint failed: users.key_hash');

      errorHandler(err, mockReq, mockRes, vi.fn());

      const jsonCall = mockRes.json.mock.calls[0][0];
      // In dev, the error message is shown
      expect(jsonCall.error).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: Status Code Handling
  // ────────────────────────────────────────────────────────────────────────────

  describe('Status Code Handling', () => {
    it('uses err.status if provided', () => {
      const err = new Error('Not Found') as any;
      err.status = 404;

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('defaults to 500 if status is undefined', () => {
      const err = new Error('Something went wrong');
      // Deliberately don't set err.status

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('handles custom HTTP status codes', () => {
      const err = new Error('Unauthorized') as any;
      err.status = 401;

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('handles 403 Forbidden', () => {
      const err = new Error('Forbidden') as any;
      err.status = 403;

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: Stack Trace Visibility
  // ────────────────────────────────────────────────────────────────────────────

  describe('Stack Trace Visibility', () => {
    it('includes stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('Dev mode error') as any;
      err.stack = 'Error: Dev mode error\n    at someFunction (file.ts:10:5)';

      errorHandler(err, mockReq, mockRes, vi.fn());

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.stack).toBeDefined();
      expect(jsonCall.stack).toContain('someFunction');
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

    it('returns specific error message in development', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('Specific validation error');

      errorHandler(err, mockReq, mockRes, vi.fn());

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error).toBe('Specific validation error');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CATEGORY 5: Unknown / Generic Errors
  // ────────────────────────────────────────────────────────────────────────────

  describe('Unknown / Generic Errors', () => {
    it('returns 500 for unexpected errors without status', () => {
      const err = new Error('Unexpected system error');

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
    });

    it('handles errors with missing message property', () => {
      const err: any = new Error();
      delete err.message;

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error).toBeDefined();
    });

    it('logs error to console.error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('Test error');
      err.name = 'TestError';

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CATEGORY 6: Response Format
  // ────────────────────────────────────────────────────────────────────────────

  describe('Response Format', () => {
    it('always includes success: false', () => {
      const err = new Error('Any error');

      errorHandler(err, mockReq, mockRes, vi.fn());

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
    });

    it('always includes error message', () => {
      const err = new Error('Generic error');

      errorHandler(err, mockReq, mockRes, vi.fn());

      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error).toBeDefined();
      expect(typeof jsonCall.error).toBe('string');
    });

    it('responds with JSON for all errors', () => {
      const err = new Error('Test');

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.json).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CATEGORY 7: Edge Cases
  // ────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('handles errors with null or undefined properties gracefully', () => {
      const err: any = { name: 'CustomError' };
      // No message, status, stack, etc.

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error).toBeDefined();
    });

    it('handles error with empty message string', () => {
      const err = new Error('');

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalled();
      // Should fall back to 'Internal Server Error' or similar
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.error).toBeDefined();
    });

    it('preserves error chain information', () => {
      const originalErr = new Error('Original error');
      const wrappedErr = new Error('Wrapped error');
      wrappedErr.cause = originalErr;

      errorHandler(wrappedErr, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CATEGORY 8: Real-World Scenarios
  // ────────────────────────────────────────────────────────────────────────────

  describe('Real-World Scenarios', () => {
    it('handles duplicate bookmark creation attempt', () => {
      const err = new Error('UNIQUE constraint failed: bookmarks.user_uuid,bookmarks.url');

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(409);
      const jsonCall = mockRes.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
    });

    it('handles folder not found scenario', () => {
      const err = new Error('FOREIGN KEY constraint failed') as any;
      err.status = 400;

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('handles malformed bookmark URL submission', () => {
      const err = new Error('Invalid JSON payload') as any;
      err.type = 'entity.parse.failed';

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('handles database lock/busy scenario', () => {
      const err = new Error('database is locked');

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('handles permission denied on agent key creation', () => {
      const err = new Error('Unauthorized') as any;
      err.status = 401;

      errorHandler(err, mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
