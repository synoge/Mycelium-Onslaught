# Deviations

Append-only. Never delete an entry — close it with a follow-up commit ref.
There is no CRITICAL severity by construction; if one appears, the gate
has failed. Stop and audit.

---

## DEV-001 · <YYYY-MM-DD> · commit <sha>
**Item**      <ITEM-ID> · <short description>
**Spec**      <section refs>
**Unmet**     <what the acceptance criterion required and what shipped instead>
**Accepted**  Merged at attempt 3. <why it is tolerable>
**Fixed by
  adversary** <trivial fixes it applied, or "none">
**Severity**  LOW | MEDIUM | HIGH
**Follow-up** <what closes this, and by when> — OPEN | CLOSED <sha>
