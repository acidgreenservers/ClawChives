# Testing Strategy for r.jina.ai Implementation

## Overview

This document outlines a comprehensive testing strategy for the r.jina.ai feature implementation in ClawChives bookmark manager. The strategy covers unit testing, integration testing, end-to-end testing, security testing, and performance testing to ensure the feature is robust, secure, and performs well.

## Testing Pyramid

### 1. Unit Testing

#### 1.1 Service Layer Testing

Test individual services and utilities in isolation:

```typescript
// tests/services/jinaProxyService.test.ts
import { JinaProxyService } from '../../src/services/jinaProxyService';
import { ContentFilter } from '../../src/utils/contentFilter';
import { URLValidator } from '../../src/utils/urlValidator';

describe('JinaProxyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchContent', () => {
    it('should fetch content from valid r.jina.ai URL', async () => {
      const mockResponse = { ok: true, text: () => Promise.resolve('Test content') };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await JinaProxyService.fetchContent('https://r.jina.ai/http://example.com');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://r.jina.ai/http://example.com',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          headers: {
            'User-Agent': 'ClawChives/1.0 (Human Access Only)'
          }
        })
      );
      expect(result).toBe('Test content');
    });

    it('should throw error for invalid HTTP response', async () => {
      const mockResponse = { ok: false, status: 404, statusText: 'Not Found' };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(JinaProxyService.fetchContent('https://r.jina.ai/http://example.com'))
        .rejects.toThrow('HTTP 404: Not Found');
    });

    it('should apply content filtering', async () => {
      const mockContent = '<script>alert("xss")</script>Safe content';
      const mockResponse = { ok: true, text: () => Promise.resolve(mockContent) };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      // Mock ContentFilter to return filtered content
      jest.spyOn(ContentFilter, 'filterContent').mockReturnValue({
        isSafe: true,
        content: 'Safe content'
      });

      const result = await JinaProxyService.fetchContent('https://r.jina.ai/http://example.com');

      expect(ContentFilter.filterContent).toHaveBeenCalledWith(mockContent);
      expect(result).toBe('Safe content');
    });

    it('should timeout after specified duration', async () => {
      global.fetch = jest.fn(() => new Promise(resolve => setTimeout(resolve, 35000)));

      await expect(JinaProxyService.fetchContent('https://r.jina.ai/http://example.com'))
        .rejects.toThrow();
    });
  });
});
```

#### 1.2 Utility Function Testing

Test utility functions for URL validation and content filtering:

```typescript
// tests/utils/urlValidator.test.ts
import { URLValidator } from '../../src/utils/urlValidator';

describe('URLValidator', () => {
  describe('validateJinaURL', () => {
    it('should validate correct r.jina.ai URL', () => {
      const result = URLValidator.validateJinaURL('https://r.jina.ai/http://example.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject non-r.jina.ai URLs', () => {
      const result = URLValidator.validateJinaURL('https://example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL must be a valid r.jina.ai URL');
    });

    it('should reject URLs with blocked domains', () => {
      const result = URLValidator.validateJinaURL('https://r.jina.ai/http://localhost:3000');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Access to internal/private networks is not allowed');
    });

    it('should reject URLs with suspicious patterns', () => {
      const result = URLValidator.validateJinaURL('https://r.jina.ai/http://example.com/../../../etc/passwd');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL contains suspicious patterns');
    });

    it('should handle invalid URL formats', () => {
      const result = URLValidator.validateJinaURL('invalid-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });
  });
});
```

#### 1.3 Middleware Testing

Test middleware functions for security and validation:

```typescript
// tests/middleware/humanAccessControl.test.ts
import { humanAccessControl } from '../../src/middleware/humanAccessControl';

describe('humanAccessControl', () => {
  it('should allow human user agents', () => {
    const req = {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;
    const next = jest.fn();

    humanAccessControl(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should block bot user agents', () => {
    const req = {
      headers: { 'user-agent': 'Googlebot/2.1' }
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;
    const next = jest.fn();

    humanAccessControl(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BOT_DETECTED',
        message: 'Automated access is not permitted'
      }
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should block agent keys for r.jina endpoints', () => {
    const req = {
      headers: { 'user-agent': 'Mozilla/5.0' },
      body: { agentKey: 'test-agent-key' },
      path: '/api/bookmarks/r.jina'
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;
    const next = jest.fn();

    humanAccessControl(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AGENT_ACCESS_DENIED',
        message: 'Agent access is not permitted for r.jina.ai endpoints'
      }
    });
    expect(next).not.toHaveBeenCalled();
  });
});
```

### 2. Integration Testing

#### 2.1 API Endpoint Testing

Test complete API endpoints with database integration:

```typescript
// tests/integration/rjinaEndpoint.test.ts
import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';

describe('r.jina.ai API Endpoints', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/bookmarks/r.jina', () => {
    it('should fetch content from valid r.jina.ai URL', async () => {
      // Mock external fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('Test content from r.jina.ai')
      });

      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .send({
          url: 'https://r.jina.ai/http://example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Test content from r.jina.ai');
      expect(response.body.data.metadata.sourceUrl).toBe('https://r.jina.ai/http://example.com');
    });

    it('should reject invalid r.jina.ai URLs', async () => {
      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .send({
          url: 'https://example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_URL');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .send({
          url: 'https://r.jina.ai/http://example.com'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should block agent access', async () => {
      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .send({
          url: 'https://r.jina.ai/http://example.com',
          agentKey: 'test-agent-key'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AGENT_ACCESS_DENIED');
    });
  });

  describe('POST /api/bookmarks with convertToJina', () => {
    it('should create bookmark with converted URL', async () => {
      // Mock external fetch for r.jina.ai conversion
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('Converted content')
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: 'bookmark-123', url: 'https://r.jina.ai/http://example.com' }
          })
        });

      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', 'Bearer test-token')
        .send({
          url: 'http://example.com',
          title: 'Test Bookmark',
          convertToJina: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBe('https://r.jina.ai/http://example.com');
      expect(response.body.data.convertedToJina).toBe(true);
    });
  });
});
```

#### 2.2 Database Integration Testing

Test database operations and migrations:

```typescript
// tests/integration/database.test.ts
import { DatabaseService } from '../../src/services/databaseService';
import { Bookmark } from '../../src/models/bookmark';

describe('Database Integration', () => {
  beforeEach(async () => {
    await DatabaseService.connect();
    await DatabaseService.runMigration('add_jina_support');
  });

  afterEach(async () => {
    await DatabaseService.rollbackMigration('add_jina_support');
    await DatabaseService.disconnect();
  });

  it('should create bookmark with jina fields', async () => {
    const bookmarkData = {
      url: 'https://r.jina.ai/http://example.com',
      title: 'Test Bookmark',
      convertedToJina: true,
      jinaUrl: 'https://r.jina.ai/http://example.com'
    };

    const bookmark = await Bookmark.create(bookmarkData);
    
    expect(bookmark.convertedToJina).toBe(true);
    expect(bookmark.jinaUrl).toBe('https://r.jina.ai/http://example.com');
  });

  it('should query bookmarks by jina conversion status', async () => {
    // Create test bookmarks
    await Bookmark.create({ url: 'http://example.com', title: 'Regular Bookmark' });
    await Bookmark.create({ 
      url: 'https://r.jina.ai/http://example.com', 
      title: 'Jina Bookmark',
      convertedToJina: true 
    });

    const jinaBookmarks = await Bookmark.findAll({ where: { convertedToJina: true } });
    const regularBookmarks = await Bookmark.findAll({ where: { convertedToJina: false } });

    expect(jinaBookmarks).toHaveLength(1);
    expect(regularBookmarks).toHaveLength(1);
    expect(jinaBookmarks[0].title).toBe('Jina Bookmark');
  });
});
```

### 3. End-to-End Testing

#### 3.1 User Workflow Testing

Test complete user workflows from frontend to backend:

```typescript
// tests/e2e/bookmarkWorkflow.test.ts
import { test, expect } from '@playwright/test';

test.describe('r.jina.ai Bookmark Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create bookmark with r.jina conversion', async ({ page }) => {
    // Navigate to bookmark creation
    await page.click('[data-testid="add-bookmark-button"]');
    
    // Fill form
    await page.fill('[data-testid="bookmark-url"]', 'http://example.com');
    await page.fill('[data-testid="bookmark-title"]', 'Example Article');
    
    // Enable r.jina conversion
    await page.check('[data-testid="convert-to-jina"]');
    
    // Submit form
    await page.click('[data-testid="create-bookmark-button"]');
    
    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify bookmark appears in list with r.jina indicator
    await expect(page.locator('[data-testid="bookmark-item"]')).toContainText('Example Article');
    await expect(page.locator('[data-testid="jina-indicator"]')).toBeVisible();
  });

  test('should fetch r.jina content in modal', async ({ page }) => {
    // Create a bookmark with r.jina conversion
    await page.click('[data-testid="add-bookmark-button"]');
    await page.fill('[data-testid="bookmark-url"]', 'http://example.com');
    await page.check('[data-testid="convert-to-jina"]');
    await page.click('[data-testid="create-bookmark-button"]');
    
    // Open bookmark details
    await page.click('[data-testid="bookmark-item"]');
    
    // Verify r.jina content is displayed
    await expect(page.locator('[data-testid="jina-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="jina-content"]')).toContainText('Extracted content');
  });

  test('should handle conversion errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/bookmarks/r.jina', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to fetch content from r.jina.ai'
          }
        })
      });
    });

    // Try to create bookmark with conversion
    await page.click('[data-testid="add-bookmark-button"]');
    await page.fill('[data-testid="bookmark-url"]', 'http://example.com');
    await page.check('[data-testid="convert-to-jina"]');
    await page.click('[data-testid="create-bookmark-button"]');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to fetch content');
    
    // Verify user can still create bookmark without conversion
    await page.uncheck('[data-testid="convert-to-jina"]');
    await page.click('[data-testid="create-bookmark-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
```

#### 3.2 Cross-Browser Testing

Test functionality across different browsers and devices:

```typescript
// tests/e2e/crossBrowser.test.ts
import { test, expect, BrowserContext } from '@playwright/test';

test.describe('Cross-Browser Compatibility', () => {
  test('should work in Chrome', async ({ browser, page }) => {
    await testBookmarkWorkflow(page);
  });

  test('should work in Firefox', async ({ browser, page }) => {
    await testBookmarkWorkflow(page);
  });

  test('should work in Safari', async ({ browser, page }) => {
    await testBookmarkWorkflow(page);
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/dashboard');
    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="add-bookmark-button"]');
    
    // Test mobile-specific interactions
    await page.fill('[data-testid="bookmark-url"]', 'http://example.com');
    await page.check('[data-testid="convert-to-jina"]');
    await page.click('[data-testid="create-bookmark-button"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});

async function testBookmarkWorkflow(page: any) {
  await page.goto('/dashboard');
  await page.click('[data-testid="add-bookmark-button"]');
  await page.fill('[data-testid="bookmark-url"]', 'http://example.com');
  await page.check('[data-testid="convert-to-jina"]');
  await page.click('[data-testid="create-bookmark-button"]');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
}
```

### 4. Security Testing

#### 4.1 Authentication and Authorization Testing

Test security controls and access restrictions:

```typescript
// tests/security/auth.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('Security: Authentication & Authorization', () => {
  describe('Human-Only Access Control', () => {
    it('should block requests with bot user agents', async () => {
      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('User-Agent', 'Googlebot/2.1')
        .send({ url: 'https://r.jina.ai/http://example.com' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('BOT_DETECTED');
    });

    it('should block agent keys for r.jina endpoints', async () => {
      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .set('User-Agent', 'Mozilla/5.0')
        .send({
          url: 'https://r.jina.ai/http://example.com',
          agentKey: 'test-agent-key'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('AGENT_ACCESS_DENIED');
    });

    it('should allow human user agents', async () => {
      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .send({ url: 'https://r.jina.ai/http://example.com' });

      expect(response.status).toBe(200);
    });
  });

  describe('URL Validation Security', () => {
    it('should block URLs with internal IP addresses', async () => {
      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .send({ url: 'https://r.jina.ai/http://127.0.0.1:3000' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_URL');
    });

    it('should block URLs with suspicious patterns', async () => {
      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .send({ url: 'https://r.jina.ai/http://example.com/../../../etc/passwd' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_URL');
    });

    it('should block excessively long URLs', async () => {
      const longUrl = 'https://r.jina.ai/' + 'a'.repeat(3000);
      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .send({ url: longUrl });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_URL');
    });
  });

  describe('Content Security', () => {
    it('should filter malicious content', async () => {
      // Mock fetch to return malicious content
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<script>alert("xss")</script>Malicious content')
      });

      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .send({ url: 'https://r.jina.ai/http://example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('CONTENT_FILTER_ERROR');
    });

    it('should block excessively large content', async () => {
      // Mock fetch to return large content
      const largeContent = 'a'.repeat(15 * 1024 * 1024); // 15MB
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(largeContent)
      });

      const response = await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .send({ url: 'https://r.jina.ai/http://example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('CONTENT_FILTER_ERROR');
    });
  });
});
```

#### 4.2 Rate Limiting Testing

Test rate limiting mechanisms:

```typescript
// tests/security/rateLimiting.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('Security: Rate Limiting', () => {
  it('should limit requests per user', async () => {
    const requests = [];
    
    // Make 101 requests (limit is 100 per hour)
    for (let i = 0; i < 101; i++) {
      requests.push(
        request(app)
          .post('/api/bookmarks/r.jina')
          .set('Authorization', 'Bearer test-token')
          .send({ url: `https://r.jina.ai/http://example${i}.com` })
      );
    }

    const responses = await Promise.all(requests);
    
    // First 100 should succeed
    expect(responses.slice(0, 100).every(r => r.status === 200)).toBe(true);
    
    // 101st should be rate limited
    expect(responses[100].status).toBe(429);
    expect(responses[100].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should limit requests per IP', async () => {
    const requests = [];
    
    // Make requests from same IP (simulated)
    for (let i = 0; i < 501; i++) {
      requests.push(
        request(app)
          .post('/api/bookmarks/r.jina')
          .set('X-Forwarded-For', '192.168.1.100')
          .send({ url: `https://r.jina.ai/http://example${i}.com` })
      );
    }

    const responses = await Promise.all(requests);
    
    // First 500 should succeed
    expect(responses.slice(0, 500).every(r => r.status === 200)).toBe(true);
    
    // 501st should be rate limited
    expect(responses[500].status).toBe(429);
    expect(responses[500].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
```

### 5. Performance Testing

#### 5.1 Load Testing

Test system performance under load:

```typescript
// tests/performance/load.test.ts
import autocannon from 'autocannon';
import app from '../../src/app';

describe('Performance: Load Testing', () => {
  let server: any;

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should handle 100 concurrent requests', (done) => {
    const instance = autocannon({
      url: `http://localhost:${server.address().port}/api/bookmarks/r.jina`,
      connections: 100,
      duration: 30,
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://r.jina.ai/http://example.com'
      })
    });

    autocannon.track(instance);

    instance.on('done', (result) => {
      expect(result.errors).toBe(0);
      expect(result.non2xx).toBe(0);
      expect(result.meanLatency).toBeLessThan(2000); // Mean latency under 2 seconds
      expect(result.maxLatency).toBeLessThan(10000); // Max latency under 10 seconds
      done();
    });
  });

  it('should maintain performance with increasing load', (done) => {
    const connections = [10, 50, 100, 200];
    const results: any[] = [];

    const runTest = (connIndex: number) => {
      if (connIndex >= connections.length) {
        // Verify performance doesn't degrade significantly
        const latencies = results.map(r => r.meanLatency);
        const maxIncrease = Math.max(...latencies) / Math.min(...latencies);
        expect(maxIncrease).toBeLessThan(3); // No more than 3x increase
        done();
        return;
      }

      const instance = autocannon({
        url: `http://localhost:${server.address().port}/api/bookmarks/r.jina`,
        connections: connections[connIndex],
        duration: 10,
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://r.jina.ai/http://example.com'
        })
      });

      instance.on('done', (result) => {
        results.push(result);
        runTest(connIndex + 1);
      });
    };

    runTest(0);
  });
});
```

#### 5.2 Stress Testing

Test system behavior under extreme load:

```typescript
// tests/performance/stress.test.ts
describe('Performance: Stress Testing', () => {
  it('should handle 1000 concurrent requests without crashing', (done) => {
    const instance = autocannon({
      url: `http://localhost:${server.address().port}/api/bookmarks/r.jina`,
      connections: 1000,
      duration: 60,
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://r.jina.ai/http://example.com'
      })
    });

    instance.on('done', (result) => {
      // System should remain stable
      expect(result.errors).toBeLessThan(result.requests * 0.1); // Less than 10% errors
      expect(result.non2xx).toBeLessThan(result.requests * 0.2); // Less than 20% non-2xx
      done();
    });
  });

  it('should recover gracefully after high load', (done) => {
    // First, apply high load
    const stressTest = autocannon({
      url: `http://localhost:${server.address().port}/api/bookmarks/r.jina`,
      connections: 500,
      duration: 30,
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://r.jina.ai/http://example.com'
      })
    });

    stressTest.on('done', () => {
      // Wait for system to recover
      setTimeout(() => {
        // Test normal operation
        const recoveryTest = autocannon({
          url: `http://localhost:${server.address().port}/api/bookmarks/r.jina`,
          connections: 10,
          duration: 10,
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: 'https://r.jina.ai/http://example.com'
          })
        });

        recoveryTest.on('done', (result) => {
          expect(result.errors).toBe(0);
          expect(result.non2xx).toBe(0);
          expect(result.meanLatency).toBeLessThan(2000);
          done();
        });
      }, 5000); // Wait 5 seconds for recovery
    });
  });
});
```

#### 5.3 Memory and Resource Testing

Test memory usage and resource management:

```typescript
// tests/performance/memory.test.ts
describe('Performance: Memory Testing', () => {
  it('should not leak memory during repeated requests', async () => {
    const initialMemory = process.memoryUsage();
    
    // Make many requests
    for (let i = 0; i < 1000; i++) {
      await request(app)
        .post('/api/bookmarks/r.jina')
        .set('Authorization', 'Bearer test-token')
        .send({ url: `https://r.jina.ai/http://example${i}.com` });
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  it('should handle concurrent requests without resource exhaustion', async () => {
    const concurrentRequests = 100;
    const requests = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        request(app)
          .post('/api/bookmarks/r.jina')
          .set('Authorization', 'Bearer test-token')
          .send({ url: `https://r.jina.ai/http://example${i}.com` })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // All requests should complete successfully
    expect(responses.every(r => r.status === 200)).toBe(true);
    
    // Check for resource exhaustion indicators
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
  });
});
```

### 6. Test Data Management

#### 6.1 Test Database Setup

Create test data management utilities:

```typescript
// tests/helpers/database.ts
import { DatabaseService } from '../../src/services/databaseService';

export async function setupTestDatabase() {
  await DatabaseService.connect();
  await DatabaseService.runMigration('create_test_data');
}

export async function cleanupTestDatabase() {
  await DatabaseService.rollbackMigration('create_test_data');
  await DatabaseService.disconnect();
}

export async function createTestUser(userData: any) {
  return await User.create(userData);
}

export async function createTestBookmark(bookmarkData: any) {
  return await Bookmark.create(bookmarkData);
}
```

#### 6.2 Mock Data Factories

Create factories for generating test data:

```typescript
// tests/factories/index.ts
import { User, Bookmark } from '../../src/models';

export const UserFactory = {
  create: (overrides = {}) => ({
    username: 'testuser',
    email: 'test@example.com',
    password: 'testpassword',
    ...overrides
  })
};

export const BookmarkFactory = {
  create: (overrides = {}) => ({
    url: 'https://r.jina.ai/http://example.com',
    title: 'Test Bookmark',
    description: 'A test bookmark',
    convertedToJina: true,
    jinaUrl: 'https://r.jina.ai/http://example.com',
    ...overrides
  })
};
```

### 7. Continuous Integration Testing

#### 7.1 CI Pipeline Configuration

Configure CI pipeline for comprehensive testing:

```yaml
# .github/workflows/test.yml
name: Test r.jina.ai Feature

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:e2e

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:security

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:performance
```

This comprehensive testing strategy ensures that the r.jina.ai feature is thoroughly tested across all layers, from individual units to complete user workflows, while maintaining security and performance standards.
