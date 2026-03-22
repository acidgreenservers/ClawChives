import { useState } from "react";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Folder, Palette } from "lucide-react";

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folder: { name: string; color: string }) => void;
  folder?: { id: string; name: string; color: string };
}

const COLORS = [
  "#E63946", // Red
  "#F4A261", // Orange
  "#E9C46A", // Yellow
  "#2A9D8F", // Teal
  "#264653", // Dark Cyan
  "#457B9D", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#10B981", // Green
  "#6B7280", // Gray
];

export function FolderModal({ isOpen, onClose, onSave, folder }: FolderModalProps) {
  const [name, setName] = useState(folder?.name || "");
  const [color, setColor] = useState(folder?.color || COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color });
    setName("");
    setColor(COLORS[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Folder className="w-5 h-5 text-cyan-700" />
            {folder ? "Edit Folder" : "New Folder"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="My Awesome Folder"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Color
            </Label>
            <div className="grid grid-cols-5 gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-cyan-700 scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-900 hover:bg-cyan-800">
              {folder ? "Update Folder" : "Create Folder"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}