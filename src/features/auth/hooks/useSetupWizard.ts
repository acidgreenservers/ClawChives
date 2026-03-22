import { useState } from "react";
import { generateHumanKey, generateUUID, hashToken } from '@/shared/lib/crypto';
import { getApiBaseUrl } from "@/config/apiConfig";
import { useAuthSession } from "./useAuthSession";

export type Step = "welcome" | "profile" | "generating" | "complete";

export const useSetupWizard = (onComplete: (username: string, token: string) => void) => {
  const [step, setStep] = useState<Step>("welcome");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [generatedUUID, setGeneratedUUID] = useState("");
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { storeSession } = useAuthSession();

  const handleGenerateKeypair = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    try {
      setStep("generating");
      await new Promise((r) => setTimeout(r, 800));

      const key = generateHumanKey();
      const uuid = generateUUID();
      setGeneratedKey(key);
      setGeneratedUUID(uuid);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate identity key.");
      setStep("profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!username.trim() || !hasDownloaded || !generatedKey || !generatedUUID) return;

    setLoading(true);
    setError("");

    try {
      const keyHash = await hashToken(generatedKey);
      const apiUrl = getApiBaseUrl();

      const registerResponse = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: generatedUUID, username: username.trim(), keyHash }),
      });

      if (!registerResponse.ok) {
        const errData = await registerResponse.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to register identity on the server.");
      }

      const tokenResponse = await fetch(`${apiUrl}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "human", uuid: generatedUUID, keyHash }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to obtain API token. Is server running?");
      }

      const { data: tokenData } = await tokenResponse.json();
      
      storeSession({
        token: tokenData.token,
        username: username.trim(),
        uuid: generatedUUID,
        type: "human"
      });

      onComplete(username.trim(), generatedKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    step,
    username,
    displayName,
    generatedKey,
    generatedUUID,
    hasDownloaded,
    copied,
    error,
    loading,
    setStep,
    setUsername,
    setDisplayName,
    setHasDownloaded,
    setCopied,
    setError,
    handleGenerateKeypair,
    handleCompleteSetup
  };
};
