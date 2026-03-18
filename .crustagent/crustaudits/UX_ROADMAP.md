---
agent: UI UX Planning
date: 2026-03-18
version: 1.0
status: PHASED_EXECUTION
maintained_by: CrustAgent©™
---

# ClawChives UX Roadmap — Learning from Linkwarden

## Overview

ClawChives has a clean, young design. Linkwarden has a mature, feature-complete design. We studied Linkwarden NOT to copy code, but to understand what a mature single-user bookmark manager should *do*. This document identifies the gaps and phases them for systematic improvement.

**Rule:** We keep ClawChives' look and feel. We learn Linkwarden's systems and interactions.

---

## Gap Analysis: 14 Key Areas

### Critical Gaps (Phase 2-3)

| # | Feature | Linkwarden | ClawChives Today | Impact | Phase |
|---|---------|-----------|-----------------|--------|-------|
| 1 | **View modes** | Grid / Masonry / List + column slider | Grid only (list/bento in dead code) | Users can't choose layout density or switch to list view | Phase 2 |
| 2 | **Sort controls** | Date newest/oldest, Name A-Z/Z-A | None — insertion order only | 690 bookmarks unsorted = unmanageable | Phase 2 |
| 3 | **Bulk actions** | Multi-select → bulk edit/delete/tag, merge tags | Entirely absent | Managing 690 items one-by-one = painful | Phase 4 |
| 4 | **Folder count badges** | Aggregated in sidebar, including nested | Calculated but NEVER RENDERED in sidebar | Users can't see how many bookmarks per pod | Phase 3 |
| 5 | **Empty state CTAs** | Every empty state has action button | All text-only, no clickable button | Users don't know what to do in empty states | Phase 3+ |

### High-Value Gaps (Phase 3-4)

| # | Feature | Linkwarden | ClawChives Today | Impact | Phase |
|---|---------|-----------|-----------------|--------|-------|
| 6 | **Stat card navigation** | Click "690 Links" → routes to all links | Decorative only, non-clickable | Stats feel incomplete | Phase 3+ |
| 7 | **Dashboard "See All"** | Every section has a "View All" link | 10-item scroll sections have no escape | Users get stuck in the dashboard view | Phase 3+ |
| 8 | **Tag sorting** | 6 sort options: count, date, name | Unsorted (insertion order) | Tags displayed in random order | Phase 4+ |
| 9 | **Tag merge/rename** | Merge N tags → 1, consolidate | Delete only, no merge or rename | Tag debt accumulates | Phase 4+ |

### Lower-Priority Gaps (Phase 4+, Backlog)

| # | Feature | Linkwarden | ClawChives Today | Impact | Phase |
|---|---------|-----------|-----------------|--------|-------|
| 10 | **Context menu parity** | Pin, Edit, Delete in kebab AND hover toolbar | Edit/Star/Archive only on hover | Missing menu options feel incomplete | Backlog |
| 11 | **Drag-and-drop** | Cards → folders, folders → tags, sidebar reorder | Wired in prototype, completely removed | Power users miss DnD workflow | Backlog |
| 12 | **Mobile card actions** | Hover toolbar + right-click kebab | Hover toolbar only (invisible on touch) | Mobile users have no way to edit cards | Backlog |
| 13 | **Sidebar collapse** | Icon-only mode (56px) + tooltip | Always expanded, no collapse option | Desktop space wasted on mobile | Backlog |
| 14 | **Dead code cleanup** | N/A | BookmarkDashboard.tsx, SearchBar.tsx, FolderModal.tsx, ConfirmModal.tsx cluttering the codebase | Confusion for new developers | Cleanup |

---

## What We Are NOT Copying

- **Archiving system** — Screenshots, PDF exports, Monolith archives. Out of scope for ClawChives.
- **Team collaboration** — Shared collections, public collections, user permissions. Single-user app.
- **Meilisearch integration** — Full-text search tier. Not needed for 690 items with client-side debounced filter.
- **@atlaskit/tree drag-and-drop** — Heavy dep, maintained only for Atlassian products. Low ROI for single-user.

---

## Phased Roadmap

### Phase 1: COMPLETE ✅
**Performance Overhaul**
- React Query infinite scroll + optimistic mutations
- @tanstack/react-virtual DOM virtualization
- 300ms debounce on search
- Pagination (50 items/page)

**Status:** Shipped. All 73 HardShell tests passing. Zero breaking changes.

---

### Phase 2: NEXT (HIGH PRIORITY)

#### 2a — Sort Controls
**What:** Add a sort dropdown to the bookmark grid (top-right, next to search)
- Date Newest First (current default)
- Date Oldest First
- Name A-Z
- Name Z-A

**Why:** 690 bookmarks unsorted is unusable. This is a table-stakes feature.

**Implementation notes:**
- Store sort selection in `localStorage` (per Linkwarden)
- Sort is applied client-side after react-query fetch (memoized sort comparator)
- Update `useInfiniteBookmarks` to expose sort state + setter
- Add SortDropdown component to Dashboard (next to current search bar or dedicated button)

**Files to touch:**
- `src/hooks/useInfiniteBookmarks.ts` — add sort state
- `src/components/dashboard/Dashboard.tsx` — add sort dropdown, apply sort to filteredBookmarks
- New: `src/components/dashboard/SortDropdown.tsx`
- `src/lib/utils.ts` — add sort comparator functions

**Effort:** Low (1-2 hours)
**Testing:** Manual + verify sort persists across refresh

---

#### 2b — List View Mode
**What:** Connect the prototype's grid/list toggle to live react-query data.

**Current state:**
- `BookmarkCard` accepts `layout` prop (unused)
- `BookmarkGrid` uses hardcoded grid CSS
- Prototype `BookmarkDashboard.tsx` has full list/grid/bento toggle logic (dead)

**What to do:**
- Add "view mode" state to Dashboard (grid / list / bento)
- Persist in localStorage
- Conditionally render `BookmarkList` or `BookmarkGrid` based on mode
- Create `BookmarkList.tsx` component (rows instead of grid)
- Use the bento/masonry logic from the prototype

**Why:** Gives power users choice of layout density. List view is denser for quick scanning.

**Files to touch:**
- `src/components/dashboard/Dashboard.tsx` — add view mode state
- New: `src/components/dashboard/ViewDropdown.tsx`
- New or refactor: `src/components/dashboard/BookmarkList.tsx`
- `src/components/dashboard/BookmarkCard.tsx` — consume the `layout` prop properly

**Effort:** Medium (3-4 hours)
**Testing:** Manual — verify all views render correctly, persist across refresh

---

### Phase 3: QUEUED (MEDIUM PRIORITY)

#### 3a — Folder Count Badges
**What:** Render the bookmark count next to each pod name in the sidebar.

**Current state:**
- `Sidebar.tsx` line 127: `folderBookmarkCount` is calculated but NEVER rendered
- It's there in the code, just not shown in the UI

**What to do:**
- Add a count badge (`<span>` with muted color) next to each pod name
- Show as `"Pod Name (42)"` or `"Pod Name" <42 badge>`

**Why:** Users can't see how many bookmarks are in each pod. This is a 10-minute fix with high UX value.

**Files to touch:**
- `src/components/dashboard/Sidebar.tsx` — render the count badge on each folder item

**Effort:** Trivial (15 minutes)
**Testing:** Verify counts match actual bookmark count per folder

---

#### 3b — Corrected Folder Behavior
**What:** Fix pod (folder) creation/edit/delete interactions and remove dead code.

**Current issues:**
- `FolderModal.tsx` is unused (old version, shadowed by `FolderEditModal.tsx`)
- No nested folders
- No drag-and-drop reordering in sidebar
- Delete folder behavior has edge cases (Pinned pod cannot be deleted but button is disabled with amber warning)

**What to do:**
1. Delete `FolderModal.tsx` (dead code)
2. Consolidate all folder operations into `FolderEditModal.tsx`
3. Test create/edit/delete flows thoroughly
4. Add a "reorder pods" feature via drag-and-drop (LOW priority, can defer to Phase 4)

**Why:** Simplify the codebase and ensure folder operations are rock-solid for 690 bookmarks.

**Files to touch:**
- Delete: `src/components/dashboard/FolderModal.tsx`
- `src/components/dashboard/FolderEditModal.tsx` — consolidate logic
- `src/components/dashboard/Sidebar.tsx` — verify pod list is using the correct modal

**Effort:** Medium (2-3 hours)
**Testing:** Full folder CRUD flow: create, rename, delete (empty and non-empty), delete Pinned pod (should fail gracefully)

---

### Phase 4: BACKLOG (LOWER PRIORITY)

#### 4a — Bulk Actions
**What:** Add multi-select mode with bulk delete, bulk move to pod, bulk tag.

**Implementation:**
- Add "edit mode" button (pencil icon) to the top-right toolbar
- When active: each card shows a checkbox. Cards select/deselect on click.
- Bulk action toolbar appears with:
  - "Select All / Deselect All" checkbox + count label
  - "Move to Pod" dropdown
  - "Add Tags" dropdown (adds to existing tags, doesn't replace)
  - "Delete Selected" button (red, with confirmation)

**Why:** Bulk operations are essential for managing 690 items. Delete 50 old bookmarks at once instead of 50 clicks.

**Files to touch:**
- `src/components/dashboard/Dashboard.tsx` — add edit mode state
- New: `src/components/dashboard/BulkActionBar.tsx`
- `src/components/dashboard/BookmarkCard.tsx` — show checkbox in edit mode
- `src/components/dashboard/BookmarkGrid.tsx` — handle bulk selection

**Effort:** High (6-8 hours)
**Testing:** Select multiple, bulk move, bulk tag, bulk delete with confirmation

---

### Phase 4+ (Even Lower Priority, Someday)

#### Empty State CTAs
Add action buttons to every empty state (e.g., "Add Pinchmark" button on empty grid)

#### Stat Card Navigation
Make stat cards clickable — click "690 Pinchmarks" → navigate to all bookmarks

#### Dashboard "See All" Links
Add a "View All" link to every dashboard section (Recently Pinched, Top Pins, Favorites)

#### Tag Sorting
Add a sort dropdown to Tags view (Most Used, Least Used, A-Z, Z-A)

#### Tag Merge/Rename
Add a "merge tags" modal (select 2+, choose target, consolidate)

#### Context Menu Parity
Add Edit, Star, Archive to the right-click context menu (in addition to hover toolbar)

#### Sidebar Collapse
Icon-only collapsed sidebar mode (56px, tooltips on hover)

---

## Success Metrics

- **Phase 1:** 73/73 HardShell tests pass ✅
- **Phase 2:** Users can sort and switch view modes; sort selection persists
- **Phase 3:** Folder count badges render; no folder CRUD regressions
- **Phase 4:** Bulk select / delete / move works smoothly; confirming modal prevents accidental deletes

---

## Linkwarden Reference (Do NOT Copy Code)

When implementing each phase, refer to Linkwarden's code for UX patterns:

- **Sort:** `/components/SortDropdown.tsx` — how they expose sort options
- **View modes:** `/components/ViewDropdown.tsx` + `/components/LinkViews/Links.tsx` — how they switch layouts
- **Bulk actions:** `/components/LinkListOptions.tsx` + `/components/ModalContent/BulkEditLinksModal.tsx` — bulk UI pattern
- **Empty states:** Various empty state implementations — single `<NoLinksFound.tsx>` + inlined in pages

But: Do NOT copy-paste code. Understand the interaction pattern, then build ClawChives' own version using Liquid Metal aesthetics.

---

## Live Development Checklist

For each phase:
1. ✅ Write this document (done)
2. ⏳ Plan the implementation (use Plan agent if multi-file)
3. ⏳ Implement the feature
4. ⏳ Write tests (if significant logic)
5. ⏳ Manual QA (desktop + mobile if applicable)
6. ⏳ Commit with message: `feat(ui): [phase number] [feature name]`
7. ⏳ Update this roadmap with completion date

---

## Notes for Lucas

- **Linkwarden is a reference, not a blueprint.** Their codebase is large and team-oriented. Ours is small and single-user. We pick the good ideas and drop the complexity.
- **Phase 2 is critical.** Without sort + view modes, 690 bookmarks will feel chaotic.
- **Phases 3-4 scale the app.** Bulk actions especially unlock the ability to manage large collections.
- **Phases 4+ are nice-to-haves.** Don't rush them. The app is usable and performant after Phase 2.
- **Keep testing tight.** Every feature change needs a manual smoke test on desktop + mobile.

---

*Maintained by CrustAgent©™*
