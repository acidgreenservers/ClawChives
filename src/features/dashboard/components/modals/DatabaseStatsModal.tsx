import { useState, useEffect } from "react";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { X, Database, FileText, Folder, Tag, Star, Archive, Trash2, Search } from "lucide-react";
import { useDatabaseAdapter } from "@/services/database/DatabaseProvider";
import { ConfirmModal, AlertModal } from '@/shared/ui/LobsterModal';

interface DatabaseStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DatabaseStatsModal({ isOpen, onClose }: DatabaseStatsModalProps) {
  const [stats, setStats] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allBookmarks, setAllBookmarks] = useState<any[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<any[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [alertNotImpl, setAlertNotImpl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = allBookmarks.filter((b) =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredBookmarks(filtered);
    } else {
      setFilteredBookmarks(allBookmarks);
    }
  }, [searchQuery, allBookmarks]);

  const db = useDatabaseAdapter();
  const loadData = async () => {
    try {
      if (!db) return;
      
      const bookmarks = await db.getBookmarks();
      const folders = await db.getFolders();
      const keys = await db.getAgentKeys();
      const appearance = await db.getAppearanceSettings();
      const profile = await db.getProfileSettings();
      
      const uniqueTags = new Set(bookmarks.flatMap((b: any) => b.tags || [])).size;
      const starredCount = bookmarks.filter((b: any) => b.starred).length;
      const archivedCount = bookmarks.filter((b: any) => b.archived).length;
      
      const totalSizeMB = (
        (JSON.stringify(bookmarks).length + 
        JSON.stringify(folders).length + 
        JSON.stringify(keys).length + 
        JSON.stringify(appearance).length + 
        JSON.stringify(profile).length) / (1024 * 1024)
      ).toFixed(2);
      
      const statsData = {
        totalBookmarks: bookmarks.length,
        totalFolders: folders.length,
        uniqueTags,
        totalSizeMB: parseFloat(totalSizeMB),
        starredCount,
        archivedCount,
        totalKeys: keys.length,
        totalSettings: (appearance ? 1 : 0) + (profile ? 1 : 0),
      };

      setStats(statsData);
      setAllBookmarks(bookmarks);
      setFilteredBookmarks(bookmarks);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    if (!db) return;
    await db.deleteBookmark(id);
    await loadData();
  };

  const handleClearDatabase = async () => {
    if (!db) return;
    try {
      await db.deleteAllBookmarks();
      await db.deleteAllFolders();
      await loadData();
    } catch (e) {
      console.error("Failed to clear database:", e);
      setAlertNotImpl(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border-2 border-red-500/50 dark:border-red-500/70 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-red-500/30 dark:border-red-500/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Database className="w-5 h-5 text-cyan-700" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Database Statistics</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900/40 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    <span className="text-sm font-medium text-cyan-900 dark:text-cyan-400">Pinchmarks</span>
                  </div>
                  <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{stats.totalBookmarks}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-900 dark:text-amber-400">Pods</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.totalFolders}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900/40 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-400">Unique Tags</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.uniqueTags}</p>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-slate-700 dark:text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-300">Size</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">{stats.totalSizeMB} MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-900 dark:text-amber-400">Starred</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.starredCount}</p>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900/40 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Archive className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    <span className="text-sm font-medium text-cyan-900 dark:text-cyan-400">Archived</span>
                  </div>
                  <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{stats.archivedCount}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900/40 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-green-700 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-400">Keys</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.totalKeys}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-400">Settings</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSettings}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">All Pinchmarks</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search pinchmarks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-950">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          URL
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Tags
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredBookmarks.map((bookmark) => (
                        <tr key={bookmark.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-950">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {bookmark.starred && <Star className="w-4 h-4 text-amber-500 fill-current" />}
                              {bookmark.archived && <Archive className="w-4 h-4 text-cyan-600" />}
                              <span className="font-medium text-slate-900 dark:text-slate-50">{bookmark.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={bookmark.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-cyan-600 hover:underline truncate block max-w-xs"
                            >
                              {bookmark.url}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {bookmark.tags?.slice(0, 2).map((tag: string) => (
                                <span key={tag} className="text-xs px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-full">
                                  {tag}
                                </span>
                              ))}
                              {bookmark.tags?.length > 2 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">+{bookmark.tags.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {new Date(bookmark.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDeleteId(bookmark.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredBookmarks.length === 0 && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      No Pinchmarks found 🦞
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {filteredBookmarks.length} of {stats.totalBookmarks} Pinchmarks
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmClearAll(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Data
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Bookmark Confirm */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) handleDeleteBookmark(confirmDeleteId); }}
        title="Delete Pinchmark?"
        message="Are you sure you want to delete this Pinchmark from the database?"
        confirmLabel="Delete Pinchmark"
        cancelLabel="Keep it"
        variant="danger"
      />

      {/* Clear All Confirm */}
      <ConfirmModal
        isOpen={confirmClearAll}
        onClose={() => setConfirmClearAll(false)}
        onConfirm={handleClearDatabase}
        title="Clear All Data?"
        message="Are you sure you want to clear ALL database data? This cannot be undone."
        confirmLabel="Clear Everything"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Not Implemented Alert */}
      <AlertModal
        isOpen={alertNotImpl}
        onClose={() => setAlertNotImpl(false)}
        title="Not Available"
        message="Database clearing is not yet implemented via REST API on the frontend."
        variant="error"
      />
    </div>
  );
}