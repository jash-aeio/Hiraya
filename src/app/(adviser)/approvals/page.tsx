import { redirect } from "next/navigation";

import { registerAttrs } from "@/design";
import { ApprovalsScreen } from "@/features/approvals/components/ApprovalsScreen";
import { isStaff } from "@/features/navigation/navView";
import { readDemoPersonaIdFromStore, resolveDemoSession } from "@/lib/auth/demo-session";

/**
 * `/approvals` — the adviser and School Admin home (P-18).
 *
 * The `(adviser)` route group, and `registerAttrs("staff")` on the landmark, so
 * the whole subtree renders in the calm register (D12).
 *
 * **The redirect is convenience, not access control.** A learner who types this
 * URL is sent home rather than shown an empty table, but what they could
 * actually *see* if they got past it is decided by the SELECT policy on
 * `events`, which returns them published rows only — a learner asking for
 * `status=pending` gets an empty list from the database, not from this check
 * (`src/db/rls/events.sql`, and the note on `status` in
 * `features/events/schema.ts`). Two places would be two places to be wrong; the
 * policy is the one that counts.
 */
export default async function ApprovalsPage() {
  const roles = await readSessionRoles();

  if (!roles) redirect("/");
  if (!isStaff(roles)) redirect("/");

  return (
    <main
      {...registerAttrs("staff")}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8 lg:max-w-5xl"
    >
      <ApprovalsScreen />
    </main>
  );
}

async function readSessionRoles(): Promise<readonly string[] | null> {
  const personaId = await readDemoPersonaIdFromStore();
  if (!personaId) return null;

  try {
    const session = await resolveDemoSession(personaId);
    return session ? session.claims.roles : null;
  } catch {
    return null;
  }
}
