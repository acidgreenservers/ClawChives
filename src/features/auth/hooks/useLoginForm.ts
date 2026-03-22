import { useState } from "react";
import { validateIdentityFile, hashToken } from '@/shared/lib/crypto';
import { getApiBaseUrl } from "@/config/apiConfig";
import { useAuthSession } from "./useAuthSession";

export type LoginMode = "upload" | "paste";

export const useLoginForm = (onSuccess: (uuid: string) => void) => {
  const [loginMode, setLoginMode] = useState<LoginMode>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [pastedKey, setPastedKey] = useState("");
  const [pastedUuid, setPastedUuid] = useState("");
  const [pastedUsername, setPastedUsername] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { storeSession } = useAuthSession();

  const pastedKeyValid = pastedKey.startsWith("hu-") && pastedKey.length === 67;
  const pastedKeyError =
    pastedKey.length > 0 && !pastedKeyValid
      ? pastedKey.startsWith("hu-")
        ? `Key must be 67 characters (hu- + 64). Current length: ${pastedKey.length}`
        : 'ClawKey©™ must start with "hu-"'
      : "";

  const handleModeSwitch = (mode: LoginMode) => {
    setLoginMode(mode);
    setError("");
  };

  const handleFileChange = (file: File | null) => {
    setKeyFile(file);
    setError("");
  };

  const handleLogin = async () => {
    if (!keyFile) {
      setError("Please select your identity key file.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const text = await keyFile.text();
      const keyData = JSON.parse(text);
      
      const missingFields = validateIdentityFile(keyData);
      if (missingFields.length > 0) {
        throw new Error(`Identity file is missing or has invalid fields: ${missingFields.join(", ")}.`);
      }

      const { uuid, token, username } = keyData as { username: string; uuid: string; token: string };
      const keyHash = await hashToken(token);
      const apiUrl = getApiBaseUrl();

      const tokenResponse = await fetch(`${apiUrl}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "human", uuid, keyHash }),
      });

      if (!tokenResponse.ok) {
        const errData = await tokenResponse.json().catch(() => ({}));
        throw new Error(errData.error || "Invalid identity file or server unreachable.");
      }

      const { data } = await tokenResponse.json();
      storeSession({
        token: data.token,
        username,
        uuid,
        type: "human"
      });

      onSuccess(uuid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your identity file.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasteLogin = async () => {
    if (!pastedKeyValid) return;

    setLoading(true);
    setError("");

    try {
      const token = pastedKey.trim();
      const keyHash = await hashToken(token);
      const apiUrl = getApiBaseUrl();

      const tokenResponse = await fetch(`${apiUrl}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: "human", 
          uuid: pastedUuid.trim().length > 0 ? pastedUuid.trim() : undefined, 
          keyHash 
        }),
      });

      if (!tokenResponse.ok) {
        const errData = await tokenResponse.json().catch(() => ({}));
        const suggestion = errData.suggestion ? `\n\nSuggestion: ${errData.suggestion}` : "";
        throw new Error((errData.error || "Invalid ClawKey©™ or identity details.") + suggestion);
      }

      const { data } = await tokenResponse.json();
      storeSession({
        token: data.token,
        username: data.user?.username || pastedUsername.trim() || "Sovereign User",
        uuid: data.user?.uuid || pastedUuid.trim(),
        type: "human"
      });

      onSuccess(data.user?.uuid || pastedUuid.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please verify your ClawKey©™, UUID, and username.");
    } finally {
      setLoading(false);
    }
  };

  return {
    loginMode,
    loading,
    error,
    keyFile,
    pastedKey,
    pastedUuid,
    pastedUsername,
    showAdvanced,
    pastedKeyValid,
    pastedKeyError,
    handleModeSwitch,
    handleFileChange,
    handleLogin,
    handlePasteLogin,
    setPastedKey,
    setPastedUuid,
    setPastedUsername,
    setShowAdvanced,
    setError
  };
};
