import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Download, Shield, User, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { generateHumanKey, generateUUID, downloadIdentityFile, type IdentityData } from "../../lib/crypto";
import * as IndexedDB from "../../lib/indexedDB";

type Step = "welcome" | "profile" | "keypair" | "complete";

interface SetupWizardProps {
  onComplete: (username: string, token: string) => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string>("");
  const [generatedUUID, setGeneratedUUID] = useState<string>("");
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const handleGenerateKeypair = () => {
    if (!username.trim()) return;

    // Simulate generation delay for effect
    setTimeout(() => {
      const key = generateHumanKey();
      const uuid = generateUUID();
      setGeneratedKey(key);
      setGeneratedUUID(uuid);
      setStep("complete");
    }, 1500);
  };

  const handleCompleteSetup = async () => {
    if (!username.trim() || !hasDownloaded) return;

    // Save to IndexedDB
    await IndexedDB.saveUser({
      username: username.trim(),
      displayName: displayName.trim() || username.trim(),
      uuid: generatedUUID,
      token: generatedKey,
      createdAt: new Date().toISOString(),
    });

    onComplete(username.trim(), generatedKey);
  };

  const handleDownloadIdentity = () => {
    const identityData: IdentityData = {
      username: username.trim(),
      uuid: generatedUUID,
      token: generatedKey,
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
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className={`h-2 w-2 rounded-full ${step === "welcome" ? "bg-cyan-600" : "bg-cyan-200"}`} />
            <div className={`h-2 w-2 rounded-full ${step === "profile" ? "bg-cyan-600" : "bg-cyan-200"}`} />
            <div className={`h-2 w-2 rounded-full ${step === "keypair" ? "bg-cyan-600" : "bg-cyan-200"}`} />
            <div className={`h-2 w-2 rounded-full ${step === "complete" ? "bg-cyan-600" : "bg-cyan-200"}`} />
          </div>

          {step === "welcome" && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">Before we begin</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <span>Your data is encrypted and stored locally</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <span>You'll generate a unique identity key</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <span>Keep your key file safe - it's your only access</span>
                  </li>
                </ul>
              </div>
              <Button 
                onClick={() => setStep("profile")}
                className="w-full bg-cyan-700 hover:bg-cyan-800"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === "profile" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <User className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Create Your Identity</h3>
                <p className="text-sm text-slate-600">
                  Enter your details to generate your secure key
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="your-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This will be attached to your unique key
                  </p>
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
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep("welcome")}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleGenerateKeypair}
                  disabled={!username.trim()}
                  className="flex-1 bg-cyan-700 hover:bg-cyan-800"
                >
                  Generate Key
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === "keypair" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                  <Shield className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Generating Identity Key</h3>
                <p className="text-sm text-slate-600">
                  Creating secure key for {username}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="flex items-center justify-center gap-2 text-cyan-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600" />
                  <span className="text-sm font-medium">Generating secure key...</span>
                </div>
              </div>
            </div>
          )}

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
                  <Label className="text-xs font-semibold text-slate-500 uppercase">
                    Username
                  </Label>
                  <p className="mt-1 text-sm font-medium text-slate-900">{username}</p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">
                    Identity Key
                  </Label>
                  <code className="block mt-1 text-xs bg-slate-100 p-2 rounded break-all text-slate-700">
                    {generatedKey}
                  </code>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase">
                    UUID
                  </Label>
                  <p className="mt-1 text-xs font-mono text-slate-600">{generatedUUID}</p>
                </div>
              </div>

              <Button
                onClick={handleDownloadIdentity}
                variant={hasDownloaded ? "default" : "outline"}
                className={`w-full ${hasDownloaded ? "bg-green-600 hover:bg-green-700" : ""}`}
              >
                <Download className="w-4 h-4 mr-2" />
                {hasDownloaded ? "Identity File Downloaded" : "Download Identity File"}
              </Button>

              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep("profile")}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleCompleteSetup}
                  disabled={!hasDownloaded}
                  className="flex-1 bg-cyan-700 hover:bg-cyan-800"
                >
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}