import { getTranslations } from "next-intl/server";

import { NavBar } from "@/design/primitives/NavBar";
import { navItemsFor } from "@/features/navigation/navView";
import { readDemoPersonaIdFromStore, resolveDemoSession } from "@/lib/auth/demo-session";

/**
 * Decides which tabs this person gets, and renders the app's `nav` landmark.
 *
 * Lives in `features/navigation` rather than `design/` because the decision is
 * about roles and routes, which is not design-system business. `NavBar` itself
 * is the presentational half and holds none of this.
 *
 * **Phase 0 scope, deliberately.** DESIGN_SYSTEM.md §7 specifies five learner
 * tabs — Home · Events · Orgs · Leaderboard · Me — and two of them (Orgs, Me)
 * are Phase 1 screens that do not exist. This renders only the screens that do,
 * because a tab that leads to a 404 is worse than a tab that is not there yet.
 * P-14 replaces this with the full bar once those screens land; the component
 * does not change, only the item list does.
 *
 * Routes are hard-coded rather than derived from the filesystem: `typedRoutes`
 * already fails the build on a link to a route that does not exist, which is the
 * guarantee that actually matters here.
 */

const HIDDEN_ON = [
  // The persona picker is where a session is chosen. Offering navigation into
  // the app before one exists would be offering a path to an empty screen.
  "/demo",
  // The primitive gallery is a review surface, not part of the product.
  "/design",
] as const;

export async function AppNav() {
  const personaId = await readDemoPersonaIdFromStore();
  if (!personaId) return null;

  let roles: readonly string[];
  try {
    const session = await resolveDemoSession(personaId);
    if (!session) return null;
    roles = session.claims.roles;
  } catch {
    // Same reasoning as DemoBar: the database being unreachable must not take
    // every page down with it, and a layout that throws does exactly that.
    return null;
  }

  const t = await getTranslations("navigation");

  const items = navItemsFor(roles, {
    home: t("home"),
    events: t("events"),
    leaderboard: t("leaderboard"),
    xp: t("xp"),
    scan: t("scan"),
    approvals: t("approvals"),
  });

  return (
    <NavBar
      items={items}
      label={t("label")}
      hiddenOn={HIDDEN_ON}
      // Sidebar-only, and still translated: it is the accessible name of the
      // wordmark link, which is the one thing in the rail that is not a tab.
      homeLabel={t("brandHome")}
    />
  );
}
