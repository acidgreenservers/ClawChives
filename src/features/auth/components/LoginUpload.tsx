import { Upload, CheckCircle, Lock, Key } from "lucide-react";
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';

interface LoginUploadProps {
  keyFile: File | null;
  loading: boolean;
  onFileChange: (file: File | null) => void;
  onLogin: () => void;
}

export function LoginUpload({ keyFile, loading, onFileChange, onLogin }: LoginUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(e.target.files?.[0] || null);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="key-file">Your Identity File</Label>
        <div className="mt-2">
          <input
            id="key-file"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="key-file"
            className={`flex items-center justify-center gap-3 w-full p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              keyFile
                ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30"
                : "border-slate-300 dark:border-slate-700 hover:border-cyan-400 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20"
            }`}
          >
            {keyFile ? (
              <CheckCircle className="w-8 h-8 text-cyan-600 dark:text-cyan-500" />
            ) : (
              <Upload className="w-8 h-8 text-slate-400" />
            )}
            <div className="text-left">
              <p className="font-medium text-slate-900 dark:text-slate-50">
                {keyFile ? keyFile.name : "Click to upload your identity file"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {keyFile ? "File selected — click Login to proceed" : ".json files only"}
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-500">Can't find your identity file?</p>
            <p className="text-sm text-amber-700 dark:text-amber-600/80 mt-1">
              Your identity file is the only way to access your account. If you've lost it, you'll need to create a new account.
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={onLogin}
        disabled={!keyFile || loading}
        className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 shadow-lg shadow-cyan-200 dark:shadow-cyan-900/40 text-white"
        size="lg"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Verifying Identity...
          </>
        ) : (
          <>
            <Key className="w-4 h-4 mr-2" />
            Login with Identity File
          </>
        )}
      </Button>
    </div>
  );
}
