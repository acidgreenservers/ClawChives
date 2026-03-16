---
name: Docker Container Startup Fix
description: Root cause analysis and solution for "su-exec: tsx: No such file or directory" Docker startup failure
type: project
---

# 🐋 Docker Container Startup Fix (2026-03-16)

## Problem

Docker containers failed immediately with:
```
🔒 [ClawChives] Dropping privileges to user 'node' (UID: 1000)...
su-exec: tsx: No such file or directory
```

Both `docker-compose.dev.yml` and `docker-compose.yml` exhibited the same failure. npm scripts worked fine, but Docker always failed.

---

## Root Causes (Found During Debugging)

### Root Cause #1: Dockerfile Removed Dev Dependencies

**File:** `Dockerfile` line 36 (before fix)
```dockerfile
RUN npm install --omit=dev
```

**Why This Broke It:**
- `--omit=dev` removes all dev dependencies from `node_modules`
- `tsx` is a dev dependency (used to execute TypeScript at runtime)
- When CMD tries to run `npx tsx server.ts`, tsx doesn't exist
- Error occurs in entrypoint before the real command runs

**Impact:** No amount of entrypoint fixing would solve this without fixing the root cause.

---

### Root Cause #2: Entrypoint Added Extra Command Logic

**File:** `docker-entrypoint.sh` lines 38, 40 (before fix)
```bash
exec su-exec node npx "$@"  # Adds npx to args
```

**Why This Was Wrong:**
- The entrypoint shouldn't add command logic
- The CMD already specifies the full command: `["npx", "tsx", "server.ts"]`
- With extra npx in entrypoint, `"$@"` (CMD args) becomes: `npx tsx server.ts`
- Result: `npx npx tsx server.ts` — double invocation

**Impact:** Even if tsx was available, this would fail with incorrect command nesting.

---

### Root Cause #3: Missing npm PATH in su-exec Context

**Attempted Solution (Wrong):**
```bash
exec su-exec node "/app/node_modules/.bin/npx" "$@"
```

**Why This Failed:**
- `npx` is NOT a binary in `node_modules/.bin`
- `npx` is part of npm itself (global npm utility)
- The path doesn't exist, so this fails

**Lesson:** You can't hardcode paths for tools that come from npm. Let npm's PATH handle it.

---

## Solution Applied

Three coordinated fixes:

### Fix 1: Dockerfile — Keep Dev Dependencies

**Line 36:**
```dockerfile
# Before:
RUN npm install --omit=dev

# After:
RUN npm install  # Keeps tsx, vite, and all dev deps
```

**Why:** tsx and other dev tools are needed at runtime.

---

### Fix 2: Dockerfile CMD — Use npx

**Line 64:**
```dockerfile
# Before:
CMD ["tsx", "server.ts"]

# After:
CMD ["npx", "tsx", "server.ts"]
```

**Why:** npx is npm's executable finder. It locates tsx in node_modules and runs it, even if tsx isn't in PATH directly.

---

### Fix 3: Entrypoint — Simple Pass-Through

**Lines 35-40:**
```bash
# Before (Wrong):
if [ "$(id -u)" = "0" ]; then
    exec su-exec node npx "$@"  # Adds npx
else
    exec npx "$@"  # Adds npx
fi

# After (Correct):
if [ "$(id -u)" = "0" ]; then
    exec su-exec node "$@"  # Just pass through
else
    exec "$@"  # Just pass through
fi
```

**Why:** The entrypoint's only job is privilege dropping. The CMD handles the actual command execution.

**Flow:**
1. Container starts with ENTRYPOINT and CMD
2. Entrypoint sets up permissions, drops privileges to `node` user
3. Entrypoint passes CMD args (`["npx", "tsx", "server.ts"]`) to su-exec unchanged
4. su-exec runs as node user: `npx tsx server.ts`
5. npx locates tsx and runs it

---

## Verification

### Test 1: Dev Docker
```bash
docker-compose -f docker-compose.dev.yml up --build
```
✅ Container starts healthy
✅ API responds on :4545
✅ Healthcheck passes

### Test 2: Prod Docker
```bash
docker-compose up
```
✅ Container starts healthy (pulls from GHCR)
✅ API responds on :4545
✅ SQLite initializes correctly

### Test 3: Runtime Check
```bash
docker exec clawchives npx tsx --version
tsx v4.21.0
node v20.20.1
```
✅ tsx is available and functional

---

## Lessons Learned

1. **Dev Dependencies in Production Builds:**
   - Some dev tools (`tsx`, `vite`) are needed at runtime
   - `--omit=dev` is dangerous for Node.js server images
   - Always think about what runs in production, not just what builds

2. **Entrypoint Simplicity:**
   - Entrypoints should be minimal: permission setup + privilege drop
   - Don't add command logic; let CMD handle it
   - Keep entrypoints as simple pass-through when possible

3. **npm PATH vs Absolute Paths:**
   - `npx` is a utility that finds tools in PATH
   - Don't hardcode `/app/node_modules/.bin/` for npm utilities
   - Let npm's PATH resolution do the work

4. **Debugging Docker Failures:**
   - Start with: Is the binary available? (`docker exec ... which npx`)
   - Check: Are dev dependencies present? (`docker exec ... ls node_modules/`)
   - Verify: Is the entrypoint logic correct? (Don't add extra commands)

---

## Prevention

To prevent this regression:

1. **Never use `npm install --omit=dev` in Dockerfile** if the service runs at runtime (see INVARIANTS.md #16)

2. **Keep entrypoint logic simple** (see INVARIANTS.md #17)

3. **Test Docker builds locally** before pushing:
   ```bash
   docker build -t test .
   docker run test  # Verify it boots
   ```

4. **Watch for these error messages:**
   - `su-exec: tsx: No such file or directory` → Dockerfile missing deps or wrong CMD
   - `su-exec: npx: No such file or directory` → Don't hardcode paths, use npx from PATH
   - `[ClawChives] Initializing Container...` followed by exit → Entrypoint or CMD issue

---

## Commits

- `ac21c3e` - fix: Docker container startup failure — npm install (keep deps) + npx tsx
- `bb8018d` - fix: Remove duplicate npx invocation in entrypoint

---

**Maintained by CrustAgent©™**

Last Updated: 2026-03-16
