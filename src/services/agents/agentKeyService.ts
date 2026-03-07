import type { AgentKey } from "../../types/agent";

export interface AgentConfig {
  name: string;
  description?: string;
  permissions: AgentKey["permissions"];
  expirationType: string;
  expirationDate?: string;
  rateLimit?: number;
}

const getApiUrl = () => {
  return (import.meta as unknown as { env: Record<string, string | boolean> }).env.PROD ? "" : ((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? "http://localhost:4242").replace(/\/$/, "");
};

const getToken = () => {
  const token = sessionStorage.getItem("cc_api_token");
  if (!token) throw new Error("Not authenticated");
  return token;
};

export async function saveAgentKey(config: AgentConfig): Promise<AgentKey> {
  const response = await fetch(`${getApiUrl()}/api/agent-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create agent key");
  }

  const { data } = await response.json();
  return data;
}

export async function getAllAgentKeys(): Promise<AgentKey[]> {
  const response = await fetch(`${getApiUrl()}/api/agent-keys`, {
    headers: { "Authorization": `Bearer ${getToken()}` },
  });

  if (!response.ok) throw new Error("Failed to fetch agent keys");
  const { data } = await response.json();
  return data;
}

export async function revokeAgentKey(id: string): Promise<void> {
  const response = await fetch(`${getApiUrl()}/api/agent-keys/${id}/revoke`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });

  if (!response.ok) throw new Error("Failed to revoke agent key");
}

export async function deleteAgentKey(id: string): Promise<void> {
  const response = await fetch(`${getApiUrl()}/api/agent-keys/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });

  if (!response.ok) throw new Error("Failed to delete agent key");
}