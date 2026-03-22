import { useState, useEffect } from "react";
import { 
  PERMISSION_CONFIGS, 
  AgentKeyFormData,
  AgentKey 
} from "../../../types/agent";
import { saveAgentKey } from "../../../services/agents/agentKeyService";

export type Step = "details" | "permissions" | "expiration" | "ratelimit" | "review" | "generated";

export const useAgentKeyModal = (
  isOpen: boolean,
  onClose: () => void,
  onKeyGenerated: (agentKey: AgentKey) => void
) => {
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [formData, setFormData] = useState<AgentKeyFormData>({
    name: "",
    description: "",
    permissionLevel: "READ",
    expirationType: "30d",
    customExpirationDate: "",
    rateLimit: 0,
    customPermissions: { ...PERMISSION_CONFIGS.CUSTOM },
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

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep("details");
      setFormData({
        name: "",
        description: "",
        permissionLevel: "READ",
        expirationType: "30d",
        customExpirationDate: "",
        rateLimit: 0,
        customPermissions: { ...PERMISSION_CONFIGS.CUSTOM },
      });
      setGeneratedKey(null);
      setIsMasked(true);
      setCopied(false);
      setGenerateError("");
    }
  }, [isOpen]);

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case "details": return formData.name.trim().length > 0;
      case "expiration": return formData.expirationType === "custom" ? formData.customExpirationDate !== "" : true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep === "review") {
      handleGenerate();
    } else {
      const currentIndex = steps.findIndex(s => s.id === currentStep);
      if (currentIndex < steps.length - 1) setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) setCurrentStep(steps[currentIndex - 1].id);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError("");
    try {
      const agentKey = await saveAgentKey({
        name: formData.name,
        description: formData.description,
        permissions: formData.permissionLevel === "CUSTOM" ? formData.customPermissions! : PERMISSION_CONFIGS[formData.permissionLevel],
        expirationType: formData.expirationType,
        expirationDate: formData.expirationType === "custom" ? formData.customExpirationDate : undefined,
        rateLimit: formData.rateLimit === 0 ? undefined : formData.rateLimit,
      });
      setGeneratedKey(agentKey);
      setCurrentStep("generated");
      onKeyGenerated(agentKey);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Failed to generate key.");
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    currentStep,
    formData,
    generatedKey,
    isMasked,
    copied,
    isGenerating,
    generateError,
    steps,
    setFormData,
    setCurrentStep,
    setIsMasked,
    setCopied,
    handleNext,
    handleBack,
    handleClose: onClose,
    isStepValid
  };
};
