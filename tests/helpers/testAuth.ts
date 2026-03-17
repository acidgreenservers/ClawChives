import Database from 'better-sqlite3-multiple-ciphers';
import request from 'supertest';
import { Express } from 'express';
import { createTestUser, TestUser } from './testFactories.js';

/**
 * Authentication helpers for tests.
 * These functions handle token generation and user setup for API testing.
 */

/**
 * Gets a session token (api-token) for a given human key.
 * Used to authenticate subsequent API requests.
 */
export async function getHumanToken(
  app: Express,
  uuid: string,
  keyHash: string
): Promise<string> {
  const res = await request(app)
    .post('/api/auth/token')
    .send({ type: 'human', uuid, keyHash });

  if (res.status !== 201 || !res.body.data?.token) {
    throw new Error(
      `Failed to get human token: ${res.status} ${JSON.stringify(res.body)}`
    );
  }

  return res.body.data.token;
}

/**
 * Gets a session token for a given agent key.
 * Used to authenticate agent/automation API requests.
 */
export async function getAgentToken(
  app: Express,
  agentApiKey: string
): Promise<string> {
  const res = await request(app)
    .post('/api/auth/token')
    .send({ type: 'agent', ownerKey: agentApiKey });

  if (res.status !== 201 || !res.body.data?.token) {
    throw new Error(
      `Failed to get agent token: ${res.status} ${JSON.stringify(res.body)}`
    );
  }

  return res.body.data.token;
}

/**
 * Creates a test user in the database and returns auth credentials.
 * Combines user factory + token generation for convenient test setup.
 */
export async function createTestUserWithToken(
  app: Express,
  db: Database.Database,
  userOverrides?: Partial<TestUser>
): Promise<{ user: TestUser; token: string }> {
  const user = createTestUser(db, userOverrides);
  const token = await getHumanToken(app, user.uuid, user.keyHash);

  return { user, token };
}

/**
 * Creates a test user and an agent key, returning both credentials.
 * Useful for testing agent functionality.
 */
export async function createTestUserWithAgent(
  app: Express,
  db: Database.Database,
  userOverrides?: Partial<TestUser>
): Promise<{
  user: TestUser;
  humanToken: string;
  agentApiKey: string;
  agentToken: string;
}> {
  const { user, token: humanToken } = await createTestUserWithToken(app, db, userOverrides);

  // Create an agent key for this user
  const agentRes = await request(app)
    .post('/api/agent-keys')
    .set('Authorization', `Bearer ${humanToken}`)
    .send({
      name: 'Test Agent',
      permissions: { canRead: true, canWrite: true }
    });

  if (agentRes.status !== 201 || !agentRes.body.data?.apiKey) {
    throw new Error(
      `Failed to create agent key: ${agentRes.status} ${JSON.stringify(agentRes.body)}`
    );
  }

  const agentApiKey = agentRes.body.data.apiKey;
  const agentToken = await getAgentToken(app, agentApiKey);

  return { user, humanToken, agentApiKey, agentToken };
}
