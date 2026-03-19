import { getApiBaseUrl } from "@/config/apiConfig";

export interface SessionError {
  url: string;
  reason: string;
}

const getApiUrl = () => {
  return getApiBaseUrl();
};

const getToken = () => {
  const token = sessionStorage.getItem("cc_api_token");
  if (!token) throw new Error("Not authenticated");
  return token;
};

export async function startLobsterSession(): Promise<{ sessionId: string; sessionKey: string }> {
  const response = await fetch(`${getApiUrl()}/api/lobster-session/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to start session");
  }

  const { data } = await response.json();
  return data;
}

export async function closeLobsterSession(sessionId: string): Promise<{ errorCount: number; errors: SessionError[] }> {
  const response = await fetch(`${getApiUrl()}/api/lobster-session/${sessionId}/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to close session");
  }

  const { data } = await response.json();
  return data;
}
