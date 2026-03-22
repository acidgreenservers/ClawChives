import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { AlertCircle } from "lucide-react";
import { InteractiveBrand } from '@/shared/branding/InteractiveBrand';
import { useSetupWizard, Step } from "./hooks/useSetupWizard";
import { WizardWelcome } from "./components/WizardWelcome";
import { WizardProfile } from "./components/WizardProfile";
import { WizardGenerating } from "./components/WizardGenerating";
import { WizardComplete } from "./components/WizardComplete";

interface SetupWizardProps {
  onComplete: (username: string, token: string) => void;
  onCancel?: () => void;
}

export function SetupWizard({ onComplete, onCancel }: SetupWizardProps) {
  const {
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
  } = useSetupWizard(onComplete);

  const handleCopyClawKey = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-2 border-red-500">
        <CardHeader className="text-center pb-4 flex flex-col items-center">
          <InteractiveBrand 
            variant="prominent" 
            showIcon={true} 
            className="flex-col gap-4 mb-4" 
            iconClassName="w-16 h-16"
          />
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

          {step === "welcome" && (
            <WizardWelcome 
              onNext={() => setStep("profile")} 
              onCancel={onCancel} 
            />
          )}

          {step === "profile" && (
            <WizardProfile
              username={username}
              displayName={displayName}
              loading={loading}
              onUsernameChange={(val) => { setUsername(val); setError(""); }}
              onDisplayNameChange={setDisplayName}
              onBack={() => { setStep("welcome"); setError(""); }}
              onNext={handleGenerateKeypair}
            />
          )}

          {step === "generating" && (
            <WizardGenerating username={username} />
          )}

          {step === "complete" && (
            <WizardComplete
              username={username}
              generatedKey={generatedKey}
              generatedUUID={generatedUUID}
              hasDownloaded={hasDownloaded}
              copied={copied}
              loading={loading}
              onDownload={() => setHasDownloaded(true)}
              onCopy={handleCopyClawKey}
              onBack={() => { setStep("profile"); setHasDownloaded(false); }}
              onComplete={handleCompleteSetup}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
