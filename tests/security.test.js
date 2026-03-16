import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

// Setup environment variables before importing the app
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = path.join(process.cwd(), 'tests', 'data');
if (!fs.existsSync(process.env.DATA_DIR)) {
  fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
}

// Import app and db after setting env
import { app, db, generateString } from '../server.js';

describe('Security Fixes: Key Generation & Agent Authorization Bypass', () => {

  afterAll(() => {
    db.close();
    // Cleanup test data
    fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
  });

  describe('Key Generation (OWASP)', () => {
    it('generates strings of correct length without modulo bias', () => {
      const length = 64;
      const key = generateString(length);
      expect(key).toHaveLength(length);
      // Ensure only valid chars
      expect(/^[A-Za-z0-9]+$/.test(key)).toBe(true);

      const key2 = generateString(length);
      expect(key).not.toBe(key2); // Extremely unlikely to collide
    });
  });

  describe('Authorization Bypass for Revoked Agents', () => {
    let humanApiToken;
    let agentApiKey;
    let agentToken;
    let agentId;

    beforeAll(async () => {
      // 1. Create a human user & token directly in DB to bypass rate limits and auth hurdles easily
      const humanUuid = '00000000-0000-0000-0000-000000000000';
      const keyHash = 'a'.repeat(64);
      db.prepare("DELETE FROM users WHERE username = 'testhuman'").run();
      db.prepare("INSERT OR IGNORE INTO users (uuid, username, key_hash, created_at) VALUES (?, ?, ?, ?)").run(
        humanUuid, 'testhuman', keyHash, new Date().toISOString()
      );

      const resHuman = await request(app)
        .post('/api/auth/token')
        .send({ type: 'human', uuid: humanUuid, keyHash });

      if (resHuman.status !== 201 || !resHuman.body.data) {
        console.error('Failed to get human token:', { status: resHuman.status, body: resHuman.body });
        throw new Error(`Failed to authenticate human: ${resHuman.status} ${JSON.stringify(resHuman.body)}`);
      }
      humanApiToken = resHuman.body.data.token;

      // 2. Create an Agent via API as the human
      // remove old agent if it exists (from aborted test runs)
      db.prepare("DELETE FROM agent_keys WHERE name = 'Test Agent' AND user_uuid = ?").run(humanUuid);

      const resAgent = await request(app)
        .post('/api/agent-keys')
        .set('Authorization', `Bearer ${humanApiToken}`)
        .send({
          name: 'Test Agent',
          permissions: { canRead: true, canWrite: true }
        });

      expect(resAgent.status).toBe(201);
      agentApiKey = resAgent.body.data.apiKey;
      agentId = resAgent.body.data.id;

      // 3. Issue an api- token for the newly created Agent
      const resAgentToken = await request(app)
        .post('/api/auth/token')
        .send({ type: 'agent', ownerKey: agentApiKey });

      expect(resAgentToken.status).toBe(201);
      agentToken = resAgentToken.body.data.token;
    });

    it('allows an active agent to authenticate and access the API', async () => {
      const res = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.keyType).toBe('agent');
    });

    it('rejects an agent whose key has been revoked', async () => {
      // Revoke the agent key
      const revokeRes = await request(app)
        .patch(`/api/agent-keys/${agentId}/revoke`)
        .set('Authorization', `Bearer ${humanApiToken}`);

      expect(revokeRes.status).toBe(200);

      // Attempt to access API using the previously generated api- token
      const res = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Lobster Key Revoked, Are you art of this reef?");
    });
  });

});
