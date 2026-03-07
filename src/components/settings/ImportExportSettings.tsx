import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Database, FileSpreadsheet, CheckCircle, Upload, FileText } from "lucide-react";
import { useDatabaseAdapter } from "../../services/database/DatabaseProvider";
import { generateUUID } from "../../lib/crypto";
import { ConfirmModal, AlertModal } from "../ui/LobsterModal";

export function ImportExportSettings() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPurgedAlert, setShowPurgedAlert] = useState(false);

  const db = useDatabaseAdapter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await importFile.text();
      const data = JSON.parse(text);

      // Validate import format
      if (!Array.isArray(data)) {
        throw new Error("Invalid file format");
      }

      // Import bookmarks
      let count = 0;
      for (const bookmark of data) {
        await db.saveBookmark({
          url: bookmark.url,
          title: bookmark.title || bookmark.url,
          description: bookmark.description || "",
          favicon: bookmark.favicon || "",
          tags: bookmark.tags || [],
          folderId: bookmark.folderId,
          starred: bookmark.starred || false,
          archived: bookmark.archived || false,
          createdAt: bookmark.createdAt || new Date().toISOString(),
          id: generateUUID(),
          updatedAt: new Date().toISOString(),
        });
        count++;
      }

      setImportResult({
        success: true,
        message: "Import completed successfully!",
        count,
      });
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "Import failed",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async (format: "json" | "html" | "csv") => {
    const bookmarks = await db.getBookmarks();

    let content = "";
    let filename = "";
    let mimeType = "";

    if (format === "json") {
      content = JSON.stringify(bookmarks, null, 2);
      filename = "clawchives_bookmarks.json";
      mimeType = "application/json";
    } else if (format === "csv") {
      const headers = ["Title", "URL", "Description", "Tags", "Starred", "Archived", "Created"];
      const rows = bookmarks.map((b: any) => [
        `"${b.title}"`,
        `"${b.url}"`,
        `"${b.description}"`,
        `"${b.tags.join(", ")}"`,
        b.starred,
        b.archived,
        b.createdAt,
      ]);
      content = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      filename = "clawchives_bookmarks.csv";
      mimeType = "text/csv";
    } else if (format === "html") {
      content = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${bookmarks.map((b: any) => `  <DT><A HREF="${b.url}" ADD_DATE="${new Date(b.createdAt || "").getTime() / 1000}">${b.title}</A>`).join("\n")}
</DL><p>`;
      filename = "clawchives_bookmarks.html";
      mimeType = "text/html";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card className="border-2 border-red-500/30 dark:border-red-500/50">
        <CardHeader>
          <CardTitle className="text-cyan-600 dark:text-cyan-400">Import Bookmarks</CardTitle>
          <CardDescription>
            Import bookmarks from JSON files or other bookmark managers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="import-file">Select File</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="flex-1"
              />
                <Button
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20"
                >
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? "Importing..." : "Import"}
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports JSON format exported from ClawChives
            </p>
          </div>

          {importResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              importResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}>
              {importResult.success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <FileText className="w-5 h-5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">{importResult.message}</p>
                {importResult.count !== undefined && (
                  <p className="text-sm opacity-80">{importResult.count} bookmarks imported</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card className="border-2 border-red-500/30 dark:border-red-500/50">
        <CardHeader>
          <CardTitle className="text-cyan-600 dark:text-cyan-400">Export Bookmarks</CardTitle>
          <CardDescription>
            Download your bookmarks in various formats for backup or migration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => handleExport("json")}
              className="h-auto flex-col gap-3 py-6 hover:border-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 dark:bg-cyan-950/30"
            >
              <Database className="w-8 h-8 text-cyan-600" />
              <div className="text-left">
                <div className="font-medium">JSON</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Full backup with metadata</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExport("html")}
              className="h-auto flex-col gap-3 py-6 hover:border-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 dark:bg-cyan-950/30"
            >
              <FileText className="w-8 h-8 text-cyan-600" />
              <div className="text-left">
                <div className="font-medium">HTML</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Netscape bookmark format</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              className="h-auto flex-col gap-3 py-6 hover:border-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 dark:bg-cyan-950/30"
            >
              <FileSpreadsheet className="w-8 h-8 text-cyan-600" />
              <div className="text-left">
                <div className="font-medium">CSV</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Spreadsheet compatible</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-2 border-red-500/30 dark:border-red-500/50">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your data
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Delete All Pinchmarks
            </Button>
        </CardContent>
      </Card>

      {/* Delete All Confirm Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          await db.deleteAllBookmarks();
          setShowPurgedAlert(true);
        }}
        title="Purge All Pinchmarks?"
        message="Are you sure you want to delete ALL Pinchmarks? This will remove every single pinch from the reef. This cannot be undone."
        confirmLabel="Purge the Reef 🦞"
        cancelLabel="Keep my Pinchmarks"
        variant="danger"
      />

      {/* Purged Success Alert */}
      <AlertModal
        isOpen={showPurgedAlert}
        onClose={() => setShowPurgedAlert(false)}
        title="Reef Purged 🦞"
        message="All Pinchmarks have been purged from the reef."
        variant="info"
      />
    </div>
  );
}