## 2024-04-15 - React Router Code Splitting Optimization
**Learning:** The initial Vite bundle size was quite large (~640kB gzip) due to top-level static imports of major application views (Dashboard, Settings, Auth) in App.tsx.
**Action:** Always implement code-splitting using `React.lazy()` and `<Suspense>` for route-level components in single-page applications to prevent large monolithic JS chunks and decrease initial load time.
