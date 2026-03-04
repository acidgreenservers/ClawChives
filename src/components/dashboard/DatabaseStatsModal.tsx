import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { X, Database, FileText, Folder, Tag, Star, Archive, Trash2, Search } from "lucide-react";
import * as IndexedDB from "../../lib/indexedDB";

interface DatabaseStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DatabaseStatsModal({ isOpen, onClose }: DatabaseStatsModalProps) {
  const [stats, setStats] = useState<IndexedDB.DatabaseStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allBookmarks, setAllBookmarks] = useState<any[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<any[]>([]);

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

  const loadData = async () => {
    const statsData = await IndexedDB.getDatabaseStats();
    const bookmarks = await IndexedDB.bookmarks.getAll();
    setStats(statsData);
    setAllBookmarks(bookmarks);
    setFilteredBookmarks(bookmarks);
  };

  const handleDeleteBookmark = async (id: string) => {
    if (confirm("Are you sure you want to delete this bookmark?")) {
      await IndexedDB.bookmarks.delete(id);
      await loadData();
    }
  };

  const handleClearDatabase = async () => {
    if (confirm("Are you sure you want to clear ALL data? This cannot be undone.")) {
      await IndexedDB.clearDatabase();
      await loadData();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Database className="w-5 h-5 text-cyan-700" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Database Statistics</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-cyan-700" />
                    <span className="text-sm font-medium text-cyan-900">Bookmarks</span>
                  </div>
                  <p className="text-3xl font-bold text-cyan-900">{stats.totalBookmarks}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="w-4 h-4 text-amber-700" />
                    <span className="text-sm font-medium text-amber-900">Folders</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-900">{stats.totalFolders}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-purple-700" />
                    <span className="text-sm font-medium text-purple-900">Unique Tags</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-900">{stats.uniqueTags}</p>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-slate-700" />
                    <span className="text-sm font-medium text-slate-900">Size</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalSizeMB} MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-amber-700" />
                    <span className="text-sm font-medium text-amber-900">Starred</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-900">{stats.starredCount}</p>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Archive className="w-4 h-4 text-cyan-700" />
                    <span className="text-sm font-medium text-cyan-900">Archived</span>
                  </div>
                  <p className="text-3xl font-bold text-cyan-900">{stats.archivedCount}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-green-700" />
                    <span className="text-sm font-medium text-green-900">Keys</span>
                  </div>
                  <p className="text-3xl font-bold text-green-900">{stats.totalKeys}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-700" />
                    <span className="text-sm font-medium text-blue-900">Settings</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalSettings}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">All Bookmarks</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search bookmarks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          URL
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Tags
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredBookmarks.map((bookmark) => (
                        <tr key={bookmark.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {bookmark.starred && <Star className="w-4 h-4 text-amber-500 fill-current" />}
                              {bookmark.archived && <Archive className="w-4 h-4 text-cyan-600" />}
                              <span className="font-medium text-slate-900">{bookmark.title}</span>
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
                                <span className="text-xs text-slate-500">+{bookmark.tags.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {new Date(bookmark.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBookmark(bookmark.id)}
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
                    <div className="text-center py-12 text-slate-500">
                      No bookmarks found
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {filteredBookmarks.length} of {stats.totalBookmarks} bookmarks
                </div>
                <Button
                  variant="destructive"
                  onClick={handleClearDatabase}
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
    </div>
  );
}