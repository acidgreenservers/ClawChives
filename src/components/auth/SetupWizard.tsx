import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Download, Shield, User, CheckCircle, ArrowRight, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import {
  generateHumanKey,
  generateUUID,
  downloadIdentityFile,
  hashToken,
  type IdentityData,
} from "../../lib/crypto";

type Step = "welcome" | "profile" | "generating" | "complete";

interface SetupWizardProps {
  onComplete: (username: string, token: string) => void;
  onCancel?: () => void;
}

export function SetupWizard({ onComplete, onCancel }: SetupWizardProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [generatedUUID, setGeneratedUUID] = useState("");
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Step: profile → generating ─────────────────────────────────────────────
  const handleGenerateKeypair = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    try {
      setStep("generating");

      // Slight artificial delay for UX effect
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

  // ── Step: complete → done ──────────────────────────────────────────────────
  const handleCompleteSetup = async () => {
    if (!username.trim() || !hasDownloaded || !generatedKey || !generatedUUID) return;

    setLoading(true);
    setError("");

    try {
      // 1. Hash the key client side to securely identify to the server
      const keyHash = await hashToken(generatedKey);

      // 2. Register identity on server 
      const apiUrl = (import.meta as unknown as { env: Record<string, string | boolean> }).env.PROD ? "" : ((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? "http://localhost:4242").replace(/\/$/, "");
      
      const registerResponse = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: generatedUUID, username: username.trim(), keyHash }),
      });

      if (!registerResponse.ok) {
        const errData = await registerResponse.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to register identity on the server.");
      }

      // 3. Exchange for API Token
      const tokenResponse = await fetch(`${apiUrl}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "human", uuid: generatedUUID, keyHash }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to obtain API token. Is server running?");
      }

      const { data: tokenData } = await tokenResponse.json();
      
      // 4. Store API token in sessionStorage
      sessionStorage.setItem("cc_api_token", tokenData.token);
      sessionStorage.setItem("cc_username", username.trim());
      sessionStorage.setItem("cc_user_uuid", generatedUUID);

      onComplete(username.trim(), generatedKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadIdentity = () => {
    const identityData: IdentityData = {
      username: username.trim(),
      uuid: generatedUUID,
      token: generatedKey,
      createdAt: new Date().toISOString(),
    };
    downloadIdentityFile(identityData);
    setHasDownloaded(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-2 border-red-500">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-red-900/20">
              <span className="text-3xl">🦞</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-50">Welcome to ClawChives</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Your sovereign bookmark library
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            {(["welcome", "profile", "generating", "complete"] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full transition-colors ${step === s ? "bg-cyan-600 dark:bg-cyan-500" : "bg-cyan-200 dark:bg-slate-700"}`}
              />
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* ── Welcome ─────────────────────────────────────────────────── */}
          {step === "welcome" && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">Before we begin</h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  {[
                    "Your data is encrypted and stored locally",
                    "You'll generate a unique identity key",
                    "Keep your key file safe — it's your only access",
                  ].map((txt) => (
                    <li key={txt} className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>{txt}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2 mt-4">
                {onCancel && (
                  <Button variant="ghost" onClick={onCancel} className="flex-1 hover:bg-slate-200 dark:hover:bg-slate-800">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                )}
                <Button onClick={() => setStep("profile")} className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg shadow-cyan-200 dark:shadow-cyan-900/40 text-white">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Profile ─────────────────────────────────────────────────── */}
          {step === "profile" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
                  <User className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-1">Create Your Identity</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Enter your details to generate your secure key</p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="your-username"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    className="mt-1"
                    autoComplete="off"
                    maxLength={32}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lowercase letters, numbers, and hyphens only. Max 32 chars.</p>
                </div>

                <div>
                  <Label htmlFor="displayName">Display Name (Optional)</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1"
                    maxLength={64}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setStep("welcome"); setError(""); }} className="flex-1 hover:bg-slate-200 dark:hover:bg-slate-800">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleGenerateKeypair}
                  disabled={!username.trim() || loading}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg shadow-cyan-200 dark:shadow-cyan-900/40 text-white"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</>
                  ) : (
                    <>Generate Key <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── Generating ──────────────────────────────────────────────── */}
          {step === "generating" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
                  <Shield className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">Generating Identity Key</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Creating secure key for <strong>{username}</strong></p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-6 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-amber-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
                <span className="text-sm font-medium">Generating secure key...</span>
              </div>
            </div>
          )}

          {/* ── Complete ────────────────────────────────────────────────── */}
          {step === "complete" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <CheckCircle className="w-12 h-12 text-cyan-600 dark:text-cyan-500 mx-auto mb-2" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">Identity Created!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your secure key has been generated for <strong>{username}</strong>
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Username</Label>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50">{username}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Identity Key (preview)</Label>
                  <code className="block mt-1 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded break-all text-slate-700 dark:text-slate-300">
                    {generatedKey.substring(0, 20)}…
                  </code>
                  <p className="text-xs text-slate-400 mt-1">Full key is stored in the downloaded file.</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">UUID</Label>
                  <p className="mt-1 text-xs font-mono text-slate-600 dark:text-slate-400">{generatedUUID}</p>
                </div>
              </div>

              <Button
                onClick={handleDownloadIdentity}
                variant={hasDownloaded ? "default" : "outline"}
                className={`w-full ${hasDownloaded ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md" : "border-slate-300 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"}`}
              >
                <Download className="w-4 h-4 mr-2" />
                {hasDownloaded ? "Identity File Downloaded ✓" : "Download Identity File"}
              </Button>

              {!hasDownloaded && (
                <p className="text-xs text-center text-amber-700 font-medium">
                  ⚠ You must download your identity file before proceeding. It cannot be recovered.
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => { setStep("profile"); setHasDownloaded(false); setGeneratedKey(""); setGeneratedUUID(""); }}
                  className="flex-1 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleCompleteSetup}
                  disabled={!hasDownloaded || loading}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg shadow-cyan-200 dark:shadow-cyan-900/40 text-white"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}