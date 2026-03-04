// Agent key generation and management

import { STORES } from "../utils/constants";
import { ValidationError } from "../utils/errors";
import { 
  getAllFromStore, 
  addToStore, 
  updateInStore, 
  deleteFromStore,
  executeTransaction 
} from "../utils/database";
import { generateRandomString } from "../utils/database";
import type { AgentKey } from "../types";

export interface AgentConfig {
  name: string;
  description?: string;
  permissions: AgentKey["permissions"];
  expirationType: string;
  expirationDate?: string;
  rateLimit?: number;
}

export async function generateAgentKey(config: AgentConfig): Promise<AgentKey> {
  if (!config.name) {
    throw new ValidationError("Agent key must have a name");
  }
  
  const apiKey = `claw_${generateRandomString(32)}`;
  const agentKey: AgentKey = {
    id: crypto.randomUUID(),
    name: config.name,
    description: config.description,
    apiKey,
    permissions: config.permissions,
    expirationType: config.expirationType,
    expirationDate: config.expirationDate,
    rateLimit: config.rateLimit,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  
  return addToStore(STORES.AGENT_KEYS, agentKey);
}

export async function getAllAgentKeys(): Promise<AgentKey[]> {
  return getAllFromStore<AgentKey>(STORES.AGENT_KEYS);
}

export async function getAgentKey(id: string): Promise<AgentKey | undefined> {
  return executeTransaction(STORES.AGENT_KEYS, "readonly", (store) => store.get(id));
}

export async function getAgentKeyByApiKey(apiKey: string): Promise<AgentKey | undefined> {
  return executeTransaction(STORES.AGENT_KEYS, "readonly", (store) => {
    const index = store.index("apiKey");
    return index.get(apiKey);
  });
}

export async function revokeAgentKey(id: string): Promise<void> {
  const keys = await getAllAgentKeys();
  const key = keys.find(k => k.id === id);
  
  if (key) {
    key.isActive = false;
    await updateInStore(STORES.AGENT_KEYS, key);
  }
}

export async function deleteAgentKey(id: string): Promise<void> {
  deleteFromStore(STORES.AGENT_KEYS, id);
}

export async function updateAgentKeyLastUsed(apiKey: string): Promise<void> {
  const key = await getAgentKeyByApiKey(apiKey);
  if (key) {
    key.lastUsed = new Date().toISOString();
    await updateInStore(STORES.AGENT_KEYS, key);
  }
}