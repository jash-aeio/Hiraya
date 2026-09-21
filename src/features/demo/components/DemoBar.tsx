import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Badge, buttonClass } from "@/design";
import { readDemoPersonaIdFromStore, resolveDemoSession } from "@/lib/auth/demo-session";
import type { DemoSession } from "@/lib/auth/demo-session";

import { ExitDemoButton } from "./ExitDemoButton";

/**
 * The DEMO DATA marker, and the way back out of a persona.
 *
 * It sits in the root layout rather than on each screen, because the failure it
 * prevents is a screenshot of a synthetic learner with nothing saying so — and
 * the screen that forgets to include a marker is exactly the screen that ends up
 * in the deck. In the layout it cannot be forgotten.
 *
 * Rendered on the server, from the cookie, so it is in the first HTML the
 * browser paints. A client-fetched marker would be absent for a beat on every
 * load, and a marker with a gap in it is a marker that can be photographed
 * missing. The Capacitor shell (Phase 5) has no server render and will need the
 * client variant; that is a Phase 5 note, not a Phase 0 shortcut.
 *
 * Staff register: this is a warning strip, not a celebration.
 */
export async function DemoBar() {
  const personaId = await readDemoPersonaIdFromStore();
  if (!personaId) return null;

  let session: DemoSession | null = null;
  try {
    session = await resolveDemoSession(personaId);
  } catch {
    // The database is unreachable. Nothing can render demo data either, so the
    // marker has nothing to mark — and a layout that throws takes every page
    // with it, including the ones that would have explained why.
    return null;
  }
  if (!session) return null;

  const t = await getTranslations("demo");

  return (
    <div className="border-b border-warning/30 bg-warning-soft">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
        {/* The word, not only the colour: meaning is never carried by colour
            alone (DESIGN_SYSTEM.md §8). */}
        <Badge tone="warning">{t("marker")}</Badge>
        <p className="type-small min-w-0 text-ink">
          {t("viewingAs", { name: session.displayName, school: session.schoolName })}
        </p>
        <div className="ml-auto flex items-center gap-1">
          <Link className={buttonClass("ghost", "md", "type-small")} href="/demo">
            {t("switch")}
          </Link>
          <ExitDemoButton />
        </div>
      </div>
    </div>
  );
}
