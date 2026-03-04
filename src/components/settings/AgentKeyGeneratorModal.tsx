import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { 
  PERMISSION_CONFIGS, 
  PERMISSION_INFO, 
  PermissionLevel, 
  ExpirationType,
  AgentKeyFormData,
  AgentKey 
} from "../../types/agent";
import { saveAgentKey } from "../../services/agents/agentKeyService";
import { Check, AlertTriangle, Copy, Eye, EyeOff, Key, Clock, Zap } from "lucide-react";

type Step = "details" | "permissions" | "expiration" | "ratelimit" | "review" | "generated";

interface AgentKeyGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyGenerated: (agentKey: AgentKey) => void;
}

export function AgentKeyGeneratorModal({ isOpen, onClose, onKeyGenerated }: AgentKeyGeneratorModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [formData, setFormData] = useState<AgentKeyFormData>({
    name: "",
    description: "",
    permissionLevel: "READ",
    expirationType: "30days",
    customExpirationDate: "",
    rateLimit: 0, // 0 = unlimited
  });
  const [generatedKey, setGeneratedKey] = useState<AgentKey | null>(null);
  const [isMasked, setIsMasked] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const steps: { id: Step; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "permissions", label: "Permissions" },
    { id: "expiration", label: "Expiration" },
    { id: "ratelimit", label: "Rate Limit" },
    { id: "review", label: "Review" },
  ];

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case "details":
        return formData.name.trim().length > 0;
      case "permissions":
        return true;
      case "expiration":
        if (formData.expirationType === "custom") {
          return formData.customExpirationDate !== "";
        }
        return true;
      case "ratelimit":
        return true;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === "review") {
      handleGenerate();
    } else {
      const currentIndex = steps.findIndex(s => s.id === currentStep);
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1].id);
      }
    }
  };

  const handleBack = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError("");
    try {
      const agentKey = await saveAgentKey({
        name: formData.name,
        description: formData.description,
        permissions: PERMISSION_CONFIGS[formData.permissionLevel],
        expirationType: formData.expirationType,
        expirationDate: formData.expirationType === "custom" ? formData.customExpirationDate : undefined,
        rateLimit: formData.rateLimit === 0 ? undefined : formData.rateLimit,
      });
      setGeneratedKey(agentKey);
      setCurrentStep("generated");
      onKeyGenerated(agentKey);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Failed to generate agent key. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      permissionLevel: "READ",
      expirationType: "30days",
      customExpirationDate: "",
      rateLimit: 0,
    });
    setGeneratedKey(null);
    setIsMasked(true);
    setCopied(false);
    setGenerateError("");
    setCurrentStep("details");
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Generate Agent Key</h2>
                <p className="text-blue-100 text-sm">Create a secure API key for your agent</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        {currentStep !== "generated" && (
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                      </div>
                      <span
                        className={`text-xs mt-1 ${
                          isActive ? "text-blue-600 font-medium" : "text-gray-500"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          isCompleted ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Error banner */}
          {generateError && (
            <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{generateError}</p>
            </div>
          )}
          {currentStep === "details" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="agent-name" className="text-base font-medium">
                  Agent Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="agent-name"
                  placeholder="e.g., My Bookmark Bot"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="agent-description" className="text-base font-medium">
                  Description <span className="text-gray-400">(optional)</span>
                </Label>
                <Textarea
                  id="agent-description"
                  placeholder="What will this agent do?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}

          {currentStep === "permissions" && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                Select the permission level for this agent. Choose the minimum level required for its task.
              </p>
              <div className="space-y-3">
                {(Object.keys(PERMISSION_INFO) as PermissionLevel[]).map((level) => {
                  const info = PERMISSION_INFO[level];
                  const isSelected = formData.permissionLevel === level;
                  
                  return (
                    <Card
                      key={level}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? `${info.bgColor} ${info.borderColor} border-2`
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setFormData({ ...formData, permissionLevel: level })}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`text-2xl ${isSelected ? "" : "opacity-50"}`}>
                            {info.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-semibold ${info.color}`}>
                                {info.label}
                              </h3>
                              {isSelected && (
                                <Check className="w-5 h-5 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {info.description}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {PERMISSION_CONFIGS[level].canRead && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  Read
                                </span>
                              )}
                              {PERMISSION_CONFIGS[level].canWrite && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  Write
                                </span>
                              )}
                              {PERMISSION_CONFIGS[level].canEdit && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                  Edit
                                </span>
                              )}
                              {PERMISSION_CONFIGS[level].canMove && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  Move
                                </span>
                              )}
                              {PERMISSION_CONFIGS[level].canDelete && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                  Delete
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === "expiration" && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Expiration</Label>
                <Select
                  value={formData.expirationType}
                  onValueChange={(value: ExpirationType) => 
                    setFormData({ ...formData, expirationType: value })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires</SelectItem>
                    <SelectItem value="30days">30 days</SelectItem>
                    <SelectItem value="90days">90 days</SelectItem>
                    <SelectItem value="1year">1 year</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.expirationType === "never" && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Security Warning</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Keys that never expire pose a security risk. Consider setting an expiration date for better security.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {formData.expirationType === "custom" && (
                <div>
                  <Label htmlFor="custom-date" className="text-base font-medium">
                    Custom Expiration Date
                  </Label>
                  <Input
                    id="custom-date"
                    type="date"
                    value={formData.customExpirationDate}
                    onChange={(e) => setFormData({ ...formData, customExpirationDate: e.target.value })}
                    className="mt-2"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              {formData.expirationType !== "never" && formData.expirationType !== "custom" && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-800">
                          This key will expire on{" "}
                          <span className="font-medium">
                            {formatDate(
                              new Date(
                                Date.now() +
                                  (formData.expirationType === "30days"
                                    ? 30 * 24 * 60 * 60 * 1000
                                    : formData.expirationType === "90days"
                                    ? 90 * 24 * 60 * 60 * 1000
                                    : 365 * 24 * 60 * 60 * 1000)
                              ).toISOString()
                            )}
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentStep === "ratelimit" && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Rate Limit (requests per minute)</Label>
                <p className="text-sm text-gray-600 mt-1">
                  Set a limit on how many requests this agent can make per minute. Leave at 0 for unlimited.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={formData.rateLimit}
                    onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="w-24 text-right">
                    <span className="text-2xl font-bold text-blue-600">
                      {formData.rateLimit === 0 ? "∞" : formData.rateLimit}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[0, 60, 300, 1000].map((value) => (
                    <button
                      key={value}
                      onClick={() => setFormData({ ...formData, rateLimit: value })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.rateLimit === value
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {value === 0 ? "Unlimited" : value}
                    </button>
                  ))}
                </div>

                {formData.rateLimit > 0 && (
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-purple-600" />
                        <p className="text-sm text-purple-800">
                          This agent can make up to{" "}
                          <span className="font-semibold">{formData.rateLimit}</span> requests per minute.
                          That's approximately{" "}
                          <span className="font-semibold">
                            {Math.round(formData.rateLimit * 60 * 24 / 1000)}K
                          </span>{" "}
                          requests per day.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {currentStep === "review" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review Agent Key Configuration</h3>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{formData.name}</CardTitle>
                  {formData.description && (
                    <CardDescription>{formData.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Permission Level</span>
                    <span className={`font-medium ${PERMISSION_INFO[formData.permissionLevel].color}`}>
                      {PERMISSION_INFO[formData.permissionLevel].icon}{" "}
                      {PERMISSION_INFO[formData.permissionLevel].label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Expiration</span>
                    <span className="font-medium">
                      {formData.expirationType === "never"
                        ? "Never expires"
                        : formData.expirationType === "custom"
                        ? formatDate(formData.customExpirationDate!)
                        : formData.expirationType.replace("days", " days").replace("year", " year")}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Rate Limit</span>
                    <span className="font-medium">
                      {formData.rateLimit === 0 ? "Unlimited" : `${formData.rateLimit} req/min`}
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="text-sm text-gray-600">Permissions:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PERMISSION_CONFIGS[formData.permissionLevel].canRead && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Read
                        </span>
                      )}
                      {PERMISSION_CONFIGS[formData.permissionLevel].canWrite && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Write
                        </span>
                      )}
                      {PERMISSION_CONFIGS[formData.permissionLevel].canEdit && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                          Edit
                        </span>
                      )}
                      {PERMISSION_CONFIGS[formData.permissionLevel].canMove && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          Move
                        </span>
                      )}
                      {PERMISSION_CONFIGS[formData.permissionLevel].canDelete && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          Delete
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === "generated" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Agent Key Generated!</h3>
                <p className="text-gray-600 mt-2">
                  Your new API key is ready. Make sure to copy it now, as you won't be able to see it again.
                </p>
              </div>

              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-sm font-medium">API Key</Label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsMasked(!isMasked)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {isMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm break-all">
                      {isMasked
                        ? generatedKey?.apiKey.replace(/./g, "•")
                        : generatedKey?.apiKey}
                    </code>
                    <Button
                      onClick={handleCopyKey}
                      className="shrink-0"
                      disabled={copied}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Important Security Notice</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Store this API key securely. Do not share it publicly or commit it to version control.
                        Treat it like a password.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep !== "generated" && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={currentStep === "details" ? handleClose : handleBack}
              disabled={isGenerating}
            >
              {currentStep === "details" ? "Cancel" : "Back"}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isStepValid() || isGenerating}
              className="min-w-[100px]"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : currentStep === "review" ? (
                "Generate Key"
              ) : (
                "Next"
              )}
            </Button>
          </div>
        )}

        {currentStep === "generated" && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}