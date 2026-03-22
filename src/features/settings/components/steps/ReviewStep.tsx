import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { 
  PERMISSION_CONFIGS, 
  PERMISSION_INFO, 
  AgentKeyFormData 
} from "@/types/agent";

interface ReviewStepProps {
  formData: AgentKeyFormData;
}

export function ReviewStep({ formData }: ReviewStepProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Review Configuration</h3>
      <Card className="dark:bg-slate-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-900 dark:text-slate-50">{formData.name}</CardTitle>
          {formData.description && (
            <CardDescription className="text-slate-600 dark:text-slate-400">{formData.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b dark:border-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-400">Permission Level</span>
            <span className={`text-sm font-medium ${PERMISSION_INFO[formData.permissionLevel].color}`}>
              {PERMISSION_INFO[formData.permissionLevel].icon} {PERMISSION_INFO[formData.permissionLevel].label}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b dark:border-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-400">Expiration</span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
              {formData.expirationType === "never" ? "Never expires" : 
               formData.expirationType === "custom" ? formatDate(formData.customExpirationDate!) : 
               formData.expirationType}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b dark:border-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-400">Rate Limit</span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
              {formData.rateLimit === 0 ? "Unlimited" : `${formData.rateLimit} req/min`}
            </span>
          </div>

          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Granular Permissions:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(PERMISSION_CONFIGS[formData.permissionLevel === "CUSTOM" ? "CUSTOM" : formData.permissionLevel]).map(([key, val]) => (
                val && key.startsWith('can') && (
                  <span key={key} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded uppercase">
                    {key.replace('can', '')}
                  </span>
                )
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
