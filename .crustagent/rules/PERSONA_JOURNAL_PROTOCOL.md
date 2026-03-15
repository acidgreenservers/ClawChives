# 📜 Rule: Persona Journal Protocol

This protocol governs the behavior of AI agent personas (BOLT, PALETTE, etc.) regarding their internal intelligence alignment.

## 🐚 Journal Storage
- All persona journals MUST be stored in the `.autoclaw/` directory at the project root.
- Filename format: `[PERSONA_NAME].md` (e.g., `BOLT.md`).

## ⏳ Temporal Compression (30-Day Rule)
- Journals MUST maintain a rolling **30-day history**.
- On every write operation, the agent MUST identify and scrub any entries older than 30 days from the current date.
- This ensures the context remains high-density and free of fossilized information.

## ✍️ Journaling Invariants
- Only document **CRITICAL** learnings, surprising edge cases, or rejected approaches.
- Do NOT log routine tasks or successful operations that follow existing patterns.
- Journal before finishing a session to pass the baton to the next agent.

*Maintained by CrustAgent©™*
