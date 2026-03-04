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
import * as IndexedDB from "../../lib/indexedDB";

type Step = "welcome" | "profile" | "generating" | "complete";

interface SetupWizardProps {
  onComplete: (username: string, token: string) => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
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
      // Check for username conflicts before generating a key
      const taken = await IndexedDB.isUsernameTaken(trimmed);
      if (taken) {
        setError(`Username "${trimmed}" is already taken on this device. Choose a different one.`);
        setLoading(false);
        return;
      }

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
      const now = new Date().toISOString();

      // 1. Save user record (no key material here)
      await IndexedDB.saveUser({
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
        uuid: generatedUUID,
        createdAt: now,
      });

      // 2. Hash the token and save it separately in the userKeys store
      const tokenHash = await hashToken(generatedKey);
      await IndexedDB.saveUserKey({
        id: generatedUUID,
        uuid: generatedUUID,
        tokenHash: tokenHash,
        createdAt: now,
      });

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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🦞</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Welcome to ClawChives</CardTitle>
          <CardDescription className="text-slate-600">
            Your sovereign bookmark library
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            {(["welcome", "profile", "generating", "complete"] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full transition-colors ${step === s ? "bg-cyan-600" : "bg-cyan-200"}`}
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
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">Before we begin</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  {[
                    "Your data is encrypted and stored locally",
                    "You'll generate a unique identity key",
                    "Keep your key file safe — it's your only access",
                  ].map((txt) => (
                    <li key={txt} className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                      <span>{txt}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button onClick={() => setStep("profile")} className="w-full bg-cyan-700 hover:bg-cyan-800">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ── Profile ─────────────────────────────────────────────────── */}
          {step === "profile" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <User className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Create Your Identity</h3>
                <p className="text-sm text-slate-600">Enter your details to generate your secure key</p>
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
                  <p className="text-xs text-slate-500 mt-1">Lowercase letters, numbers, and hyphens only. Max 32 chars.</p>
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
                <Button variant="ghost" onClick={() => { setStep("welcome"); setError(""); }} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleGenerateKeypair}
                  disabled={!username.trim() || loading}
                  className="flex-1 bg-cyan-700 hover:bg-cyan-800"
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
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                  <Shield className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Generating Identity Key</h3>
                <p className="text-sm text-slate-600">Creating secure key for <strong>{username}</strong></p>
              </div>
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 flex items-center justify-center gap-2 text-cyan-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600" />
                <span className="text-sm font-medium">Generating secure key...</span>
              </div>
            </div>
          )}

          {/* ── Complete ────────────────────────────────────────────────── */}
          {step === "complete" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-slate-900">Identity Created!</h3>
                <p className="text-sm text-slate-600">
                  Your secure key has been generated for <strong>{username}</strong>
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Username</Label>
                  <p className="mt-1 text-sm font-medium text-slate-900">{username}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Identity Key (preview)</Label>
                  <code className="block mt-1 text-xs bg-slate-100 p-2 rounded break-all text-slate-700">
                    {generatedKey.substring(0, 20)}…
                  </code>
                  <p className="text-xs text-slate-400 mt-1">Full key is stored in the downloaded file.</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">UUID</Label>
                  <p className="mt-1 text-xs font-mono text-slate-600">{generatedUUID}</p>
                </div>
              </div>

              <Button
                onClick={handleDownloadIdentity}
                variant={hasDownloaded ? "default" : "outline"}
                className={`w-full ${hasDownloaded ? "bg-green-600 hover:bg-green-700" : ""}`}
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
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleCompleteSetup}
                  disabled={!hasDownloaded || loading}
                  className="flex-1 bg-cyan-700 hover:bg-cyan-800"
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