import { Button } from '@/shared/ui/button';
import { ArrowLeft, Upload, ClipboardPaste, AlertCircle } from "lucide-react";
import { InteractiveBrand } from '@/shared/branding/InteractiveBrand';
import { useLoginForm } from "./hooks/useLoginForm";
import { LoginUpload } from "./components/LoginUpload";
import { LoginPaste } from "./components/LoginPaste";

interface LoginFormProps {
  onSuccess: (uuid: string) => void;
  onCancel: () => void;
}

export function LoginForm({ onSuccess, onCancel }: LoginFormProps) {
  const {
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
    setShowAdvanced
  } = useLoginForm(onSuccess);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border-2 border-red-500">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="mb-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="text-center mb-8 flex flex-col items-center">
          <InteractiveBrand 
            variant="prominent" 
            showIcon={true} 
            className="flex-col gap-4 mb-4" 
            iconClassName="w-16 h-16"
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">Welcome Back</h1>
          <p className="text-slate-600 dark:text-slate-400">Login with your ClawChives©™ identity</p>
        </div>

        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
          <button
            onClick={() => handleModeSwitch("upload")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
              loginMode === "upload"
                ? "bg-cyan-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
          <button
            onClick={() => handleModeSwitch("paste")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
              loginMode === "paste"
                ? "bg-cyan-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste ClawKey©™
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loginMode === "upload" ? (
          <LoginUpload 
            keyFile={keyFile} 
            loading={loading} 
            onFileChange={handleFileChange} 
            onLogin={handleLogin} 
          />
        ) : (
          <LoginPaste
            pastedKey={pastedKey}
            pastedUuid={pastedUuid}
            pastedUsername={pastedUsername}
            showAdvanced={showAdvanced}
            loading={loading}
            pastedKeyValid={pastedKeyValid}
            pastedKeyError={pastedKeyError}
            onKeyChange={setPastedKey}
            onUuidChange={setPastedUuid}
            onUsernameChange={setPastedUsername}
            onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
            onLogin={handlePasteLogin}
          />
        )}
      </div>
    </div>
  );
}
