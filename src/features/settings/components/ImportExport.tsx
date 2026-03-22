import { useState } from "react";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Upload, FileText, Database, FileSpreadsheet } from "lucide-react";

export function ImportExport() {
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImport = () => {
    console.log("Importing:", importFile?.name);
  };

  const handleExport = (format: "html" | "json" | "csv") => {
    console.log("Exporting as:", format);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Bookmarks</h3>
        <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Upload an HTML bookmark file (Netscape format)
          </p>
          <Input
            type="file"
            accept=".html,.htm"
            onChange={handleFileChange}
            className="max-w-xs mx-auto"
          />
          {importFile && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              {importFile.name}
            </div>
          )}
          <Button
            onClick={handleImport}
            disabled={!importFile}
            className="mt-4 bg-red-500 hover:bg-red-600"
          >
            Import Bookmarks
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Bookmarks</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleExport("html")}
            className="p-6 border border-gray-200 dark:border-slate-800 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-center group"
          >
            <FileText className="w-8 h-8 text-gray-400 group-hover:text-red-500 mx-auto mb-3" />
            <div className="font-medium text-gray-900">HTML</div>
            <div className="text-sm text-gray-500">Netscape format</div>
          </button>
          <button
            onClick={() => handleExport("json")}
            className="p-6 border border-gray-200 dark:border-slate-800 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-center group"
          >
            <Database className="w-8 h-8 text-gray-400 group-hover:text-red-500 mx-auto mb-3" />
            <div className="font-medium text-gray-900">JSON</div>
            <div className="text-sm text-gray-500">Full data export</div>
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="p-6 border border-gray-200 dark:border-slate-800 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-center group"
          >
            <FileSpreadsheet className="w-8 h-8 text-gray-400 group-hover:text-red-500 mx-auto mb-3" />
            <div className="font-medium text-gray-900">CSV</div>
            <div className="text-sm text-gray-500">Spreadsheet format</div>
          </button>
        </div>
      </div>
    </div>
  );
}