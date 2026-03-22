import { CheckCircle, Download, Copy, Check, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { downloadIdentityFile, type IdentityData } from '@/shared/lib/crypto';

interface WizardCompleteProps {
  username: string;
  generatedKey: string;
  generatedUUID: string;
  hasDownloaded: boolean;
  copied: boolean;
  loading: boolean;
  onDownload: () => void;
  onCopy: () => void;
  onBack: () => void;
  onComplete: () => void;
}

export function WizardComplete({
  username,
  generatedKey,
  generatedUUID,
  hasDownloaded,
  copied,
  loading,
  onDownload,
  onCopy,
  onBack,
  onComplete
}: WizardCompleteProps) {
  const handleDownload = () => {
    const identityData: IdentityData = {
      username,
      uuid: generatedUUID,
      token: generatedKey,
      createdAt: new Date().toISOString(),
    };
    downloadIdentityFile(identityData);
    onDownload();
  };

  return (
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
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Identity Key (preview)</Label>
            {typeof navigator !== "undefined" && navigator.clipboard && (
              <button
                onClick={onCopy}
                className="text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors p-0.5 rounded"
                title="Copy ClawKey©™ to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
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

      <div className="flex gap-2">
        <Button
          onClick={handleDownload}
          variant="outline"
          className={`flex-1 inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium rounded-md transition-all bg-transparent ${hasDownloaded ? "text-cyan-600 dark:text-cyan-500 border-cyan-500/50" : ""}`}
        >
          <Download className="w-4 h-4 mr-2" />
          <span>{hasDownloaded ? "Identity File Downloaded ✓" : "Download Identity File"}</span>
        </Button>

        {typeof navigator !== "undefined" && navigator.clipboard && (
          <Button
            onClick={onCopy}
            variant="outline"
            className="inline-flex items-center justify-center px-3 py-2 border border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium rounded-md transition-all"
            title="Copy ClawKey©™"
          >
            {copied ? (
              <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span className={`ml-2 hidden sm:inline ${copied ? "text-cyan-600 dark:text-cyan-500" : ""}`}>
              {copied ? "Copied!" : "Copy Key"}
            </span>
          </Button>
        )}
      </div>

      {!hasDownloaded && (
        <p className="text-xs text-center text-amber-700 font-medium">
          ⚠ You must download your identity file before proceeding. It cannot be recovered.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex-1 hover:bg-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onComplete}
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
  );
}
