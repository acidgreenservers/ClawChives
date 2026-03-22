import { Check } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { 
  PERMISSION_CONFIGS, 
  PERMISSION_INFO, 
  PermissionLevel,
  AgentKeyFormData 
} from "@/types/agent";

interface PermissionsStepProps {
  formData: AgentKeyFormData;
  onChange: (data: Partial<AgentKeyFormData>) => void;
}

export function PermissionsStep({ formData, onChange }: PermissionsStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-slate-400 mb-4 text-sm">
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
                  : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
              }`}
              onClick={() => onChange({ permissionLevel: level })}
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
                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                      {info.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {PERMISSION_CONFIGS[level].canRead && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Read</span>
                      )}
                      {PERMISSION_CONFIGS[level].canWrite && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Write</span>
                      )}
                      {PERMISSION_CONFIGS[level].canEdit && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Edit</span>
                      )}
                      {PERMISSION_CONFIGS[level].canMove && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Move</span>
                      )}
                      {PERMISSION_CONFIGS[level].canDelete && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Delete</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {formData.permissionLevel === "CUSTOM" && formData.customPermissions && (
        <div className="mt-4 p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
          <h4 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Custom Permissions</h4>
          <div className="grid grid-cols-2 gap-3">
            {(["canRead", "canWrite", "canEdit", "canMove", "canDelete"] as const).map((flag) => (
              <label key={flag} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.customPermissions![flag]}
                  onChange={(e) =>
                    onChange({
                      customPermissions: {
                        ...formData.customPermissions!,
                        [flag]: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500/20"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                  {flag.replace("can", "")}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
