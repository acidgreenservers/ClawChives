import { useState, useEffect } from "react";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { User, Mail, Save, Upload, X, Download } from "lucide-react";
import { useDatabaseAdapter } from "@/services/database/DatabaseProvider";

export function ProfileSettings() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [uuid, setUuid] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const db = useDatabaseAdapter();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    if (!db) return;
    const settings = await db.getProfileSettings();
    if (settings) {
      setDisplayName(settings.displayName);
      setEmail(settings.email || "");
      setAvatar(settings.avatar || "");
    }
    
    // Also load username and UUID from sessionStorage since we drop user object fetch
    const sessionUsername = sessionStorage.getItem("cc_username");
    const sessionUuid = sessionStorage.getItem("cc_user_uuid");
    
    if (sessionUsername) {
      setUsername(sessionUsername);
    }
    if (sessionUuid) {
      setUuid(sessionUuid);
    }
  };

  const handleSaveProfile = async () => {
    if (!db) return;
    setIsSaving(true);
    setSaveMessage("");

    try {
      await db.saveProfileSettings({
        username,
        displayName,
        email,
        avatar,
      });
      setSaveMessage("Profile updated successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar("");
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-red-500/30 dark:border-red-500/50">
        <CardHeader>
          <CardTitle className="text-cyan-600 dark:text-cyan-400">Profile Settings</CardTitle>
          <CardDescription>
            Manage your account information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center overflow-hidden border-4 border-red-500 shadow-lg">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              {avatar && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="avatar-upload">Avatar Image</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon">
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Recommended: Square image, at least 200x200px
                </p>
              </div>
            </div>
          </div>

          {/* Profile Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your unique identifier (cannot be changed after setup)
              </p>
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1"
                placeholder="How others see you"
              />
            </div>

            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {saveMessage}
              </span>
            )}
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="ml-auto bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card className="border-2 border-red-500/30 dark:border-red-500/50">
        <CardHeader>
          <CardTitle className="text-cyan-600 dark:text-cyan-400">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Account Type</span>
              <span className="font-medium text-slate-900 dark:text-slate-50">Personal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Storage</span>
              <span className="font-medium text-slate-900 dark:text-slate-50">Local (ShellCrypted©™)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">UUID</span>
              <span className="font-mono text-xs text-slate-900 dark:text-slate-50 opacity-70">{uuid || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Created</span>
              <span className="font-medium text-slate-900 dark:text-slate-50">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                className="w-full text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
                onClick={() => {
                  const identity = sessionStorage.getItem("cc_identity");
                  if (identity) {
                    const blob = new Blob([identity], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "clawchives_identity_key.json";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } else {
                    alert("No identity found. Are you logged in?");
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Identity Key
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}