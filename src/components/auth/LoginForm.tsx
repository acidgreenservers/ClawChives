import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Key, Lock, AlertCircle, Upload, ArrowLeft } from "lucide-react";
import * as IndexedDB from "../../lib/indexedDB";

interface LoginFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function LoginForm({ onSuccess, onCancel }: LoginFormProps) {
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKeyFile(file);
      setError("");
    }
  };

  const handleLogin = async () => {
    if (!keyFile) {
      setError("Please select your key file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const text = await keyFile.text();
      const keyData = JSON.parse(text);
      const user = await IndexedDB.getUser();
      if (!user || user.uuid !== keyData.uuid) {
        throw new Error("User identity not found. Please create an account first.");
      }

      if (user.publicKey !== keyData.publicKey) {
        throw new Error("Invalid key file. Please use your correct key file.");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your key file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="mb-6 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200">
            <span className="text-3xl">🦞</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-600">Login with your ClawChives key file</p>
        </div>

        <div className="space-y-6">
          <div>
            <Label htmlFor="key-file">Your Key File</Label>
            <div className="mt-2">
              <div className="relative">
                <input
                  id="key-file"
                  type="file"
                  accept=".json,.pem"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="key-file"
                  className={`flex items-center justify-center gap-3 w-full p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    keyFile
                      ? "border-cyan-500 bg-cyan-50"
                      : "border-slate-300 hover:border-cyan-400 hover:bg-cyan-50/50"
                  }`}
                >
                  <Upload className="w-8 h-8 text-slate-400" />
                  <div className="text-left">
                    <p className="font-medium text-slate-900">
                      {keyFile ? keyFile.name : "Click to upload your key file"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {keyFile ? "File selected" : ".json or .pem files only"}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Can't find your key file?
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Your key file is the only way to access your account. If you've lost it, you'll need to create a new account.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={!keyFile || loading}
            className="w-full bg-cyan-700 hover:bg-cyan-800"
            size="lg"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Verifying Key...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Login with Key
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}