import { useState, useEffect } from "react";
import { Button } from '@/shared/ui/button';
import { 
  Card, 
  CardContent, 
} from '@/shared/ui/card';
import { 
  getAllAgentKeys, 
  deleteAgentKey, 
  revokeAgentKey 
} from "@/services/agents/agentKeyService";
import { AgentKey, PERMISSION_INFO } from "@/types/agent";
import { 
  Key, 
  Shield, 
  Clock, 
  Trash2, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  Download
} from "lucide-react";
import { AgentKeyGeneratorModal } from "./AgentKeyGeneratorModal";
import { ConfirmModal } from '@/shared/ui/LobsterModal';

export function AgentPermissions() {
  const [agents, setAgents] = useState<AgentKey[]>([]);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const loadedAgents = await getAllAgentKeys();
      setAgents(loadedAgents);
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAgentKey(id);
      await loadAgents();
    } catch (error) {
      console.error("Failed to delete agent key:", error);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeAgentKey(id);
      await loadAgents();
    } catch (error) {
      console.error("Failed to revoke agent key:", error);
    }
  };

  const handleCopyKey = async (key: string, id: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(key);
      } else {
        // Fallback for non-secure contexts (e.g., HTTP IP access)
        const textArea = document.createElement("textarea");
        textArea.value = key;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Failed to copy key:", err);
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const maskKey = (key: string | undefined) => {
    if (!key) return "••••••••";
    if (key.length <= 8) return "••••••••";
    return `${key.slice(0, 4)}${"•".repeat(key.length - 8)}${key.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (agent: AgentKey) => {
    if (!agent.expirationDate) return false;
    return new Date(agent.expirationDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">Lobster Keys</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Manage API keys for external agents and automation
          </p>
        </div>
        <Button onClick={() => setIsGeneratorOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Generate Key
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card className="border-2 border-red-500/20 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="w-12 h-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-700 mb-2">No Agent Keys</h4>
            <p className="text-sm text-gray-500 text-center mb-4">
              Create an API key to allow external agents to interact with your bookmarks
            </p>
            <Button onClick={() => setIsGeneratorOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => {
            const permissionInfo = PERMISSION_INFO[agent.permissions?.level] ?? PERMISSION_INFO["READ"];
            const expired = isExpired(agent);
            const isVisible = visibleKeys.has(agent.id);
            const safeKey = agent.apiKey ?? "";
            
            return (
              <Card 
                key={agent.id} 
                className={`border-2 border-red-500/30 dark:border-red-500/50 transition-all ${
                  !agent.isActive || expired 
                    ? "opacity-60 bg-gray-50 dark:bg-slate-900/50" 
                    : "hover:shadow-md"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${permissionInfo.bgColor}`}>
                        <Shield className={`w-5 h-5 ${permissionInfo.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 dark:text-slate-50">{agent.name}</h4>
                          {!agent.isActive && (
                            <span className="px-2 py-0.5 bg-gray-200 text-slate-600 dark:text-slate-300 text-xs rounded-full">
                              Revoked
                            </span>
                          )}
                          {expired && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                              Expired
                            </span>
                          )}
                        </div>
                        {agent.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{agent.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {agent.isActive && !expired && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevoke(agent.id)}
                          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Revoke
                        </Button>
                      )}
                      <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteId(agent.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-gray-500" />
                      <span className="text-slate-600 dark:text-slate-300">Permissions:</span>
                      <span className={`font-medium ${permissionInfo.color}`}>
                        {permissionInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-slate-600 dark:text-slate-300">Created:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {formatDate(agent.createdAt)}
                      </span>
                    </div>
                  </div>

                  {agent.expirationDate && (
                    <div className="flex items-center gap-2 text-sm mb-4">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-slate-600 dark:text-slate-300">Expires:</span>
                      <span className={`font-medium ${expired ? "text-red-600" : "text-slate-900 dark:text-slate-50"}`}>
                        {formatDate(agent.expirationDate)}
                      </span>
                      {expired && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}

                  {agent.rateLimit && (
                    <div className="flex items-center gap-2 text-sm mb-4">
                      <span className="text-slate-600 dark:text-slate-300">Rate Limit:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {agent.rateLimit} req/min
                      </span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <code className={`text-sm font-mono ${isVisible ? "text-slate-900 dark:text-slate-50" : "text-slate-500 dark:text-slate-400"}`}>
                          {isVisible ? safeKey : maskKey(safeKey)}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(agent.id)}
                          className="h-8 w-8 p-0"
                        >
                          {isVisible ? (
                            <EyeOff className="w-4 h-4 text-gray-500" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyKey(safeKey, agent.id)}
                          className="h-8 w-8 p-0"
                        >
                          {copiedKey === agent.id ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const keyData = {
                              type: "agent_key",
                              key: safeKey,
                              id: agent.id,
                              name: agent.name,
                              createdAt: new Date().toISOString()
                            };
                            const blob = new Blob([JSON.stringify(keyData, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `lobster_key_${agent.name.replace(/\s+/g, '_').toLowerCase()}.json`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="h-8 w-8 p-0"
                          title="Download Key"
                        >
                          <Download className="w-4 h-4 text-gray-500 hover:text-cyan-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AgentKeyGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onKeyGenerated={loadAgents}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); }}
        title="Delete Lobster Key?"
        message="Are you sure you want to delete this Lobster Key? Any Lobsters using it will lose access. This cannot be undone."
        confirmLabel="Delete Key"
        cancelLabel="Keep it"
        variant="danger"
      />
    </div>
  );
}