import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'tests', 'data-lobster-session');
process.env.DATA_DIR = DATA_DIR;
process.env.NODE_ENV = 'test';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

import { app, db } from '../server.js';

describe('Lobster Session Flow — HardShell', () => {
  const testUserUuid = '00000000-0000-0000-0000-000000000404';
  const now = new Date().toISOString();
  let humanBearerToken: string;

  beforeAll(async () => {
    // Clean up
    db.prepare('DELETE FROM users WHERE uuid = ?').run(testUserUuid);
    db.prepare('DELETE FROM agent_keys WHERE user_uuid = ?').run(testUserUuid);
    db.prepare('DELETE FROM import_sessions WHERE user_uuid = ?').run(testUserUuid);
    db.prepare('DELETE FROM bookmarks WHERE user_uuid = ?').run(testUserUuid);

    // Create test user
    db.prepare(
      'INSERT OR IGNORE INTO users (uuid, username, key_hash, created_at) VALUES (?, ?, ?, ?)'
    ).run(testUserUuid, 'lobstersession' + Date.now(), 'h'.repeat(64), now);

    // Create an api- token pointing directly to the user uuid (for human auth)
    humanBearerToken = `api-${Math.random().toString(36).substring(2, 50)}`;

    // Register as a human token pointing directly to user
    db.prepare(`
      INSERT INTO api_tokens (key, owner_key, owner_type, created_at)
      VALUES (?, ?, ?, ?)
    `).run(humanBearerToken, testUserUuid, 'human', now);
  });

  afterAll(() => {
    if (fs.existsSync(DATA_DIR)) {
      fs.rmSync(DATA_DIR, { recursive: true, force: true });
    }
  });

  describe('POST /api/lobster-session/start', () => {
    it('rejects unauthenticated requests (401)', async () => {
      const res = await request(app)
        .post('/api/lobster-session/start')
        .send({});
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('rejects agent key (403 — human only)', async () => {
      const agentKey = `lb-${Math.random().toString(36).substring(2, 50)}`;
      db.prepare(`
        INSERT INTO agent_keys (id, user_uuid, name, api_key, permissions, expiration_type, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `agent-${Date.now()}`,
        testUserUuid,
        'TestAgent',
        agentKey,
        JSON.stringify({ canRead: true, canWrite: true }),
        'never',
        1,
        now
      );

      const res = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${agentKey}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Human');
    });

    it('creates session + ephemeral key on success (201)', async () => {
      const res = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
      expect(res.body.data.sessionKey).toBeDefined();
    });

    it('returned key has lb-eph- prefix', async () => {
      const res = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      expect(res.body.data.sessionKey).toMatch(/^lb-eph-/);
    });

    it('key is active in agent_keys after start', async () => {
      const res = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionKey = res.body.data.sessionKey;
      const keyRecord = db.prepare('SELECT is_active FROM agent_keys WHERE api_key = ?').get(sessionKey) as any;
      expect(keyRecord?.is_active).toBe(1);
    });

    it('key expiration_date is ~15 min from now', async () => {
      const beforeNow = Date.now();
      const res = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});
      const afterNow = Date.now();

      const sessionKey = res.body.data.sessionKey;
      const keyRecord = db.prepare('SELECT expiration_date FROM agent_keys WHERE api_key = ?').get(sessionKey) as any;
      const expDate = new Date(keyRecord.expiration_date).getTime();

      const expectedTime = beforeNow + 15 * 60 * 1000;
      const tolerance = 5 * 1000; // ±5 seconds
      expect(expDate).toBeGreaterThanOrEqual(expectedTime - tolerance);
      expect(expDate).toBeLessThanOrEqual(afterNow + 15 * 60 * 1000 + tolerance);
    });

    it('key permissions: canWrite only', async () => {
      const res = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionKey = res.body.data.sessionKey;
      const keyRecord = db.prepare('SELECT permissions FROM agent_keys WHERE api_key = ?').get(sessionKey) as any;
      const perms = JSON.parse(keyRecord.permissions);

      expect(perms.canWrite).toBe(true);
      expect(perms.canRead).toBe(false);
      expect(perms.canEdit).toBe(false);
      expect(perms.canDelete).toBe(false);
    });
  });

  describe('POST /api/lobster-session/:id/close', () => {
    it('rejects unauthenticated close (401)', async () => {
      const res = await request(app)
        .post('/api/lobster-session/fake-id/close')
        .send({});
      expect(res.status).toBe(401);
    });

    it('rejects close of another user\'s session (403)', async () => {
      // Create a session for test user
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});
      const sessionId = startRes.body.data.sessionId;

      // Create another user
      const otherUuid = '00000000-0000-0000-0000-000000000405';
      const otherToken = `api-${Math.random().toString(36).substring(2, 50)}`;
      db.prepare('INSERT OR IGNORE INTO users (uuid, username, key_hash, created_at) VALUES (?, ?, ?, ?)')
        .run(otherUuid, 'other' + Date.now(), 'x'.repeat(64), now);
      db.prepare('INSERT INTO api_tokens (key, owner_key, owner_type, created_at) VALUES (?, ?, ?, ?)')
        .run(otherToken, otherUuid, 'human', now);

      // Try to close with other token
      const res = await request(app)
        .post(`/api/lobster-session/${sessionId}/close`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('rejects already-closed session (409)', async () => {
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});
      const sessionId = startRes.body.data.sessionId;

      // Close once
      const closeRes1 = await request(app)
        .post(`/api/lobster-session/${sessionId}/close`)
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});
      expect(closeRes1.status).toBe(200);

      // Try to close again
      const closeRes2 = await request(app)
        .post(`/api/lobster-session/${sessionId}/close`)
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});
      expect(closeRes2.status).toBe(409);
    });

    it('revokes the ephemeral key on close', async () => {
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionId = startRes.body.data.sessionId;
      const sessionKey = startRes.body.data.sessionKey;

      const closeRes = await request(app)
        .post(`/api/lobster-session/${sessionId}/close`)
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      expect(closeRes.status).toBe(200);

      // Verify key is inactive
      const keyRecord = db.prepare('SELECT is_active FROM agent_keys WHERE api_key = ?').get(sessionKey) as any;
      expect(keyRecord?.is_active).toBe(0);
    });

    it('sets closed_at on the session row', async () => {
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionId = startRes.body.data.sessionId;

      const closeRes = await request(app)
        .post(`/api/lobster-session/${sessionId}/close`)
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      expect(closeRes.status).toBe(200);

      const sessionRecord = db.prepare('SELECT closed_at FROM import_sessions WHERE id = ?').get(sessionId) as any;
      expect(sessionRecord?.closed_at).toBeDefined();
      expect(sessionRecord.closed_at).not.toBeNull();
    });

    it('returns errorCount: 0 and errors: [] when no errors accumulated', async () => {
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionId = startRes.body.data.sessionId;

      const closeRes = await request(app)
        .post(`/api/lobster-session/${sessionId}/close`)
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      expect(closeRes.body.data.errorCount).toBe(0);
      expect(closeRes.body.data.errors).toEqual([]);
    });

    it('returns accumulated errors when session has errors', async () => {
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionId = startRes.body.data.sessionId;
      const sessionKey = startRes.body.data.sessionKey;

      // Manually add errors to session
      const testError = { url: 'https://example.com/test', reason: 'Duplicate URL' };
      db.prepare('UPDATE import_sessions SET errors_json = ?, error_count = ? WHERE id = ?')
        .run(JSON.stringify([testError]), 1, sessionId);

      const closeRes = await request(app)
        .post(`/api/lobster-session/${sessionId}/close`)
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      expect(closeRes.body.data.errorCount).toBe(1);
      expect(closeRes.body.data.errors[0].url).toBe('https://example.com/test');
      expect(closeRes.body.data.errors[0].reason).toBe('Duplicate URL');
    });
  });

  describe('Bulk import with X-Session-Id header', () => {
    it('errors accumulate in session when X-Session-Id provided', async () => {
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionId = startRes.body.data.sessionId;
      const sessionKey = startRes.body.data.sessionKey;

      // Perform bulk import with duplicate URL (will fail)
      const bookmarkRes = await request(app)
        .post('/api/bookmarks/bulk')
        .set('Authorization', `Bearer ${sessionKey}`)
        .set('X-Session-Id', sessionId)
        .send({
          bookmarks: [
            { url: 'https://unique1.com/1', title: 'Valid 1' },
            { url: 'https://unique1.com/1', title: 'Duplicate' }, // duplicate within batch
          ]
        });

      expect(bookmarkRes.status).toBe(207);
      expect(bookmarkRes.body.imported).toBe(1);
      expect(bookmarkRes.body.failed).toBe(1);

      // Check session accumulated the error
      const sessionRecord = db.prepare('SELECT errors_json, error_count FROM import_sessions WHERE id = ?').get(sessionId) as any;
      const errors = JSON.parse(sessionRecord.errors_json);
      expect(errors.length).toBe(1);
      expect(errors[0].url).toBe('https://unique1.com/1');
    });

    it('successful imports do NOT add to errors_json', async () => {
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionId = startRes.body.data.sessionId;
      const sessionKey = startRes.body.data.sessionKey;

      const bookmarkRes = await request(app)
        .post('/api/bookmarks/bulk')
        .set('Authorization', `Bearer ${sessionKey}`)
        .set('X-Session-Id', sessionId)
        .send({
          bookmarks: [
            { url: 'https://clean1.com/1', title: 'Clean 1' },
            { url: 'https://clean2.com/2', title: 'Clean 2' },
          ]
        });

      expect(bookmarkRes.status).toBe(207);
      expect(bookmarkRes.body.imported).toBe(2);
      expect(bookmarkRes.body.failed).toBe(0);

      const sessionRecord = db.prepare('SELECT errors_json, error_count FROM import_sessions WHERE id = ?').get(sessionId) as any;
      const errors = JSON.parse(sessionRecord.errors_json);
      expect(errors.length).toBe(0);
      expect(sessionRecord.error_count).toBe(0);
    });

    it('unknown session ID is silently ignored (no 500)', async () => {
      const bookmarkRes = await request(app)
        .post('/api/bookmarks/bulk')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .set('X-Session-Id', 'nonexistent-session')
        .send({
          bookmarks: [
            { url: 'https://orphan.com/1', title: 'Orphan' },
          ]
        });

      // Should still succeed — errors just won't be tracked
      expect(bookmarkRes.status).toBe(207);
      expect(bookmarkRes.body.imported).toBe(1);
    });
  });

  describe('Ephemeral key lifecycle', () => {
    it('ephemeral key can import bookmarks while session active', async () => {
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionKey = startRes.body.data.sessionKey;

      const bookmarkRes = await request(app)
        .post('/api/bookmarks/bulk')
        .set('Authorization', `Bearer ${sessionKey}`)
        .send({
          bookmarks: [
            { url: 'https://activekey.com/1', title: 'Active Key Test' },
          ]
        });

      expect(bookmarkRes.status).toBe(207);
      expect(bookmarkRes.body.imported).toBe(1);
    });

    it('ephemeral key rejected after session closed (401)', async () => {
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionId = startRes.body.data.sessionId;
      const sessionKey = startRes.body.data.sessionKey;

      // Close session
      await request(app)
        .post(`/api/lobster-session/${sessionId}/close`)
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      // Try to use key after revocation
      const bookmarkRes = await request(app)
        .post('/api/bookmarks/bulk')
        .set('Authorization', `Bearer ${sessionKey}`)
        .send({
          bookmarks: [
            { url: 'https://revoked.com/1', title: 'Should Fail' },
          ]
        });

      expect(bookmarkRes.status).toBe(401);
      expect(bookmarkRes.body.error).toBeDefined();
    });

    it('ephemeral key auto-expires after expiration_date', async () => {
      const startRes = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionKey = startRes.body.data.sessionKey;

      // Manually set expiration to past
      db.prepare('UPDATE agent_keys SET expiration_date = ? WHERE api_key = ?')
        .run(new Date(Date.now() - 1000).toISOString(), sessionKey);

      // Try to use expired key
      const bookmarkRes = await request(app)
        .post('/api/bookmarks/bulk')
        .set('Authorization', `Bearer ${sessionKey}`)
        .send({
          bookmarks: [
            { url: 'https://expired.com/1', title: 'Expired Key' },
          ]
        });

      expect(bookmarkRes.status).toBe(401);
      expect(bookmarkRes.body.error).toContain('expired');
    });
  });

  describe('Session isolation', () => {
    it('two sessions for same user are independent', async () => {
      const res1 = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const res2 = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      expect(res1.body.data.sessionId).not.toBe(res2.body.data.sessionId);
      expect(res1.body.data.sessionKey).not.toBe(res2.body.data.sessionKey);
    });

    it('closing session A does not affect session B\'s key', async () => {
      const res1 = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const res2 = await request(app)
        .post('/api/lobster-session/start')
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      const sessionId1 = res1.body.data.sessionId;
      const sessionKey2 = res2.body.data.sessionKey;

      // Close session 1
      await request(app)
        .post(`/api/lobster-session/${sessionId1}/close`)
        .set('Authorization', `Bearer ${humanBearerToken}`)
        .send({});

      // Session 2's key should still work
      const bookmarkRes = await request(app)
        .post('/api/bookmarks/bulk')
        .set('Authorization', `Bearer ${sessionKey2}`)
        .send({
          bookmarks: [
            { url: 'https://session2.com/1', title: 'Session 2 Still Active' },
          ]
        });

      expect(bookmarkRes.status).toBe(207);
      expect(bookmarkRes.body.imported).toBe(1);
    });
  });
});
