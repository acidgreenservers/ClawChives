import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { AgentKeyFormData } from '@/types/agent';

interface DetailsStepProps {
  formData: AgentKeyFormData;
  onChange: (data: Partial<AgentKeyFormData>) => void;
}

export function DetailsStep({ formData, onChange }: DetailsStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="agent-name" className="text-base font-medium text-slate-900 dark:text-slate-50">
          Agent Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="agent-name"
          placeholder="e.g., My Bookmark Bot"
          value={formData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="agent-description" className="text-base font-medium text-slate-900 dark:text-slate-50">
          Description <span className="text-slate-400 dark:text-slate-400">(optional)</span>
        </Label>
        <Textarea
          id="agent-description"
          placeholder="What will this agent do?"
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="mt-2"
          rows={3}
        />
      </div>
    </div>
  );
}
