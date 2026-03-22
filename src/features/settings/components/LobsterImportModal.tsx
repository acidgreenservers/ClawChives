import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, X, CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { startLobsterSession, closeLobsterSession, type SessionError } from '@/services/lobster/lobsterSessionService';

interface LobsterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'idle' | 'session' | 'done';

export function LobsterImportModal({ isOpen, onClose }: LobsterImportModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('idle');
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionErrors, setSessionErrors] = useState<SessionError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMasked, setIsMasked] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleReady = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { sessionId: id, sessionKey: key } = await startLobsterSession();
      setSessionId(id);
      setSessionKey(key);
      setStep('session');
    } catch (e: any) {
      setError(e.message || 'Failed to start session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { errors } = await closeLobsterSession(sessionId);
      setSessionErrors(errors);
      await queryClient.invalidateQueries({ queryKey: ['bookmarks', 'infinite'] });
      await queryClient.invalidateQueries({ queryKey: ['bookmarks', 'stats'] });
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Failed to close session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    setStep('idle');
    setSessionKey(null);
    setSessionId(null);
    setSessionErrors([]);
    setError(null);
    setIsMasked(true);
    setCopied(false);
    await queryClient.invalidateQueries({ queryKey: ['bookmarks', 'infinite'] });
    await queryClient.invalidateQueries({ queryKey: ['bookmarks', 'stats'] });
    onClose();
  };

  const handleCopy = () => {
    if (sessionKey) {
      navigator.clipboard.writeText(sessionKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseSession = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      await closeLobsterSession(sessionId);
    } catch (e: any) {
      console.error('Failed to revoke session key:', e);
    } finally {
      setIsLoading(false);
      await handleClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/50 dark:border-amber-500/70 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-amber-500/30 dark:border-amber-500/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              step === 'session' ? 'bg-green-100 dark:bg-green-900/30' :
              'bg-amber-100 dark:bg-amber-900/30'
            }`}>
              <Upload className={`w-6 h-6 ${
                step === 'session' ? 'text-green-600 dark:text-green-400' :
                'text-amber-600 dark:text-amber-400'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {step === 'idle' && 'Lobster Import'}
                {step === 'session' && 'Lobster Session Active'}
                {step === 'done' && 'Session Complete'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {step === 'idle' && (
                  <>Bulk import via <span className="text-amber-600 dark:text-amber-400 font-medium">lb-</span> agent key</>
                )}
                {step === 'session' && <span className="text-green-600 dark:text-green-400">Rate limiting suspended</span>}
                {step === 'done' && (sessionErrors.length === 0 ? 'No errors' : `${sessionErrors.length} error(s) found`)}
              </p>
            </div>
          </div>
          {step !== 'done' && (
            <button
              onClick={handleCloseSession}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
              title="Close"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {step === 'idle' && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Lobster Import allows agents with a valid <code className="text-amber-600 dark:text-amber-400 font-mono text-xs bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">lb-</code> key
                and <strong>write</strong> permission to bulk-import up to 1,000 bookmarks per request
                without rate limiting.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Click "Ready" to generate an ephemeral session key. You'll hand this key to your agent to begin the bulk import.
              </p>
            </>
          )}

          {step === 'session' && (
            <>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  ✓ Session Active — rate limiting suspended
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Session Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-slate-50">
                    {isMasked ? '•'.repeat(48) : sessionKey}
                  </div>
                  <button
                    onClick={() => setIsMasked(!isMasked)}
                    className="p-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors rounded-lg border border-slate-200 dark:border-slate-700"
                    title={isMasked ? 'Show' : 'Hide'}
                  >
                    {isMasked ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors rounded-lg border border-slate-200 dark:border-slate-700"
                    title="Copy"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                {copied && <p className="text-xs text-green-600 dark:text-green-400">Copied to clipboard!</p>}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-4">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Give this key to your agent.</strong> It expires in 15 minutes or when you click "Done".
                </p>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                ⚠️ Key shown once. If you close this modal without copying, the key is not recoverable.
              </p>
            </>
          )}

          {step === 'done' && (
            <>
              {sessionErrors.length === 0 ? (
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                    All clear — session closed successfully
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No errors during bulk import.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-3">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{sessionErrors.length} error(s) found</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    {sessionErrors.map((err, i) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <p className="text-slate-600 dark:text-slate-400 break-all">
                          <span className="font-mono">
                            {err.url.length > 50 ? err.url.substring(0, 47) + '...' : err.url}
                          </span>
                        </p>
                        <p className="text-amber-600 dark:text-amber-400 ml-2">→ {err.reason}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300">Error: {error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-amber-500/20 dark:border-amber-500/30 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          {step === 'idle' && (
            <>
              <Button
                onClick={handleClose}
                variant="outline"
                className="border-slate-300 dark:border-slate-700"
              >
                Close
              </Button>
              <Button
                onClick={handleReady}
                disabled={isLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Ready
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'session' && (
            <>
              <Button
                onClick={handleCloseSession}
                variant="outline"
                className="border-slate-300 dark:border-slate-700"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDone}
                disabled={isLoading}
                className="bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 disabled:opacity-50"
              >
                {isLoading ? 'Closing...' : 'Done'}
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button
              onClick={handleClose}
              className="bg-slate-600 hover:bg-slate-700 text-white"
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
