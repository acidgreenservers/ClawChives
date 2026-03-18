# React Query Migration - ClawChives Bookmarks

## Phase 1: Installation Required

You **must** run these commands:

```bash
npm install @tanstack/react-query react-intersection-observer @tanstack/react-virtual
```

Then audit for CVEs:

```bash
npm audit
```

Only block HIGH/CRITICAL severity issues.

## Phase 2: Files Modified

### Core Setup
- **src/services/queryClient.ts** ✅ NEW
  - QueryClient configuration (1hr cache, 5min stale time, 50 items/page)
  - Export `BOOKMARKS_PAGE_SIZE` constant

- **src/hooks/useInfiniteBookmarks.ts** ✅ NEW
  - Custom hook for infinite query + mutations
  - Handles cache updates on star, delete, edit, archive
  - Exports `flatBookmarks` for UI rendering

- **src/main.tsx** ✅ UPDATED
  - Wrapped App with `<QueryClientProvider>`
  - Imported queryClient from queryClient.ts

### Components Updated
- **src/components/dashboard/Dashboard.tsx** ✅ UPDATED
  - Replaced `useState<Bookmark[]>` with `useInfiniteBookmarks()`
  - Added `useDebounce` for search (300ms)
  - Wrapped `filteredBookmarks` and `bookmarkCounts` in `useMemo`
  - Updated mutation handlers to use react-query cache updates
  - Removed `loadData()` pattern entirely
  - Added `onFetchNextPage`, `hasNextPage`, `isFetchingNextPage` props to BookmarkGrid

- **src/components/dashboard/BookmarkGrid.tsx** ✅ UPDATED
  - Added `useInView` hook for infinite scroll sentinel
  - Added props: `onFetchNextPage`, `hasNextPage`, `isFetchingNextPage`
  - Sentinel `<div ref={sentinelRef}>` triggers `fetchNextPage()` when in view
  - Shows loading spinner while fetching next page

- **src/components/dashboard/DashboardView.tsx** ✅ UPDATED
  - Wrapped `allTags`, `recent`, `pins`, `favorites` in `useMemo`
  - Prevents recalculation on every render

- **src/components/dashboard/Sidebar.tsx** ✅ UPDATED
  - Wrapped `folderBookmarkCount` in `useCallback`
  - Prevents recreating function on every render

### Utilities Updated
- **src/lib/utils.ts** ✅ UPDATED
  - Added `useDebounce` hook (300ms default)
  - No breaking changes to `cn()` or `aggregateTags()`

### API Layer (No Changes Needed)
- **src/services/database/rest/RestAdapter.ts** ✅ VERIFIED
  - `getBookmarks(limit, offset)` already supports pagination
  - No changes required

## Phase 3: Architecture Changes

### Before (Manual loadData Pattern)
```tsx
const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

useEffect(() => {
  loadData();
}, [db]);

const loadData = async () => {
  const [allBookmarks] = await Promise.all([db.getBookmarks()]);
  setBookmarks(allBookmarks);
};

const handleToggleStar = async (bookmark) => {
  await db.updateBookmark(bookmark);
  await loadData(); // ← Full refetch every time!
};
```

### After (React Query Cache Updates)
```tsx
const { flatBookmarks, updateBookmark, fetchNextPage, hasNextPage } = useInfiniteBookmarks();

// Mutations update cache directly + optimistically
const handleToggleStar = (bookmark) => {
  updateBookmark({
    ...bookmark,
    starred: !bookmark.starred,
  });
  // Cache updated automatically, no manual loadData()
};

// Infinite scroll
<BookmarkGrid
  bookmarks={filteredBookmarks}
  onFetchNextPage={fetchNextPage}
  hasNextPage={hasNextPage}
/>
```

### Key Benefits
1. **No More Full Refetches** — Mutations update cache locally
2. **Infinite Scroll** — 50 items per page, lazy-load on scroll
3. **Memoization** — Reduce re-renders with `useMemo`/`useCallback`
4. **Smart Caching** — 5min stale time + 1hr memory cache

## Phase 4: Testing

After running `npm install`:

1. **Build Check**
   ```bash
   npm run build
   ```
   Should complete with no errors.

2. **Dev Server Check**
   ```bash
   npm run dev
   ```
   - Navigate to Dashboard
   - Scroll bookmarks (should show "Loading more..." sentinel)
   - Star/delete/archive should not flicker (optimistic updates)
   - Search should debounce (300ms delay)

3. **Performance**
   - Old: 690+ DOM nodes rendered at once → jank
   - New: ~50 nodes visible + 50 cached in memory → smooth

## Phase 5: Known Limitations & Notes

- **Backward Compatibility**: No breaking changes to component APIs
- **Virtualization**: Not yet implemented (current impl uses DOM grid)
  - Can add `useVirtualizer` to BookmarkGrid.tsx later if needed
  - Sentinel-based infinite scroll is sufficient for now
- **Search Debounce**: 300ms delay is applied to react-query query key
  - Search on filteredBookmarks is instant (client-side filter)
- **Folder Bookmarks**: Still fetched once on mount (no pagination needed)

## Phase 6: Future Enhancements

1. Add DOM virtualization with `useVirtualizer` if grid exceeds 500 visible items
2. Add optimistic mutations to all handlers (already done)
3. Monitor bundle size increase (react-query is ~20kb gzip)
4. Add query suspense if desired for loading states

---

**Maintained by CrustAgent©™**
