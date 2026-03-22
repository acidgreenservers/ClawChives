import { Clock, AlertTriangle } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/shared/ui/select";
import { ExpirationType, AgentKeyFormData } from "@/types/agent";

interface ExpirationStepProps {
  formData: AgentKeyFormData;
  onChange: (data: Partial<AgentKeyFormData>) => void;
}

export function ExpirationStep({ formData, onChange }: ExpirationStepProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium text-slate-900 dark:text-slate-50">Expiration</Label>
        <Select
          value={formData.expirationType}
          onValueChange={(value: ExpirationType) => onChange({ expirationType: value })}
        >
          <SelectTrigger className="mt-2 text-slate-900 dark:text-slate-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never expires</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="60d">60 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
            <SelectItem value="custom">Custom date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.expirationType === "never" && (
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-400 text-sm">Security Warning</h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Keys that never expire pose a security risk. Consider setting an expiration date for better security.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {formData.expirationType === "custom" && (
        <div>
          <Label htmlFor="custom-date" className="text-base font-medium text-slate-900 dark:text-slate-50">
            Custom Expiration Date
          </Label>
          <Input
            id="custom-date"
            type="date"
            value={formData.customExpirationDate}
            onChange={(e) => onChange({ customExpirationDate: e.target.value })}
            className="mt-2"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      )}

      {formData.expirationType !== "never" && formData.expirationType !== "custom" && (
        <Card className="bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <p className="text-sm text-cyan-800 dark:text-cyan-300">
                Expires on <span className="font-medium">
                  {formatDate(
                    new Date(
                      Date.now() +
                        (formData.expirationType === "30d" ? 30 : formData.expirationType === "60d" ? 60 : 90) * 24 * 60 * 60 * 1000
                    ).toISOString()
                  )}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
