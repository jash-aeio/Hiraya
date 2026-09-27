import { getTranslations } from "next-intl/server";

import { Card, CardHeader, buttonClass, registerAttrs } from "@/design";
import { HomeScreen } from "@/features/home/components/HomeScreen";
import { readDemoPersonaIdFromStore, resolveDemoSession } from "@/lib/auth/demo-session";

/**
 * `/` — the Home tab for a learner, and the front door for everyone else.
 *
 * One route with two jobs, because it genuinely has two: it is the public URL
 * handed to a teacher in a pitch *and* the tab a signed-in learner taps first.
 * Splitting them would mean either a redirect on every visit or a second URL to
 * hand out, and both are worse than a branch.
 *
 * **Staff keep the front door for now, deliberately.** An adviser or a School
 * Admin landing on an XP hero with a level medal is the exact failure
 * `DESIGN_SYSTEM.md` §5 describes — a dashboard that greets a teacher with
 * medals reads as a student toy and loses the adoption argument. Their own
 * calm surface is P-18; until it exists, showing them nothing pretending to be
 * theirs is the honest option, and inventing a placeholder dashboard would be
 * the dishonest one.
 *
 * The session is resolved here rather than in the client component so the
 * greeting is in the first paint: the name is already known server-side, and
 * making the screen wait for a fetch to say "Good morning" would put a spinner
 * where a sentence belongs on a phone over mobile data.
 */
export default async function HomePage() {
  const session = await readDemoSession();

  if (session && session.roles.includes("learner")) {
    return (
      <main
        {...registerAttrs("learner")}
        className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8 lg:max-w-4xl"
      >
        {/* The `h1` lives in HomeScreen, in every one of its states, because
            the heading this screen wants is the greeting and the greeting needs
            the device's own clock. A second one here — even sr-only — is two
            `h1`s on one screen, which the mobile audit fails and a screen
            reader reads as two titles. */}
        <HomeScreen displayName={session.displayName} />
      </main>
    );
  }

  const t = await getTranslations("landing");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="type-display text-ink">{t("heading")}</h1>
        <p className="type-body text-ink-muted">{t("subheading")}</p>
      </header>

      <Card>
        <CardHeader label={t("phaseLabel")} title={t("phaseTitle")} />
        <p className="type-body text-ink-muted">{t("phaseBody")}</p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <a className={buttonClass("primary")} href="/demo">
          {t("demoLink")}
        </a>
        <a className={buttonClass("secondary")} href="/api/v1/health">
          {t("healthLink")}
        </a>
        <a className={buttonClass("ghost")} href="/design">
          {t("designLink")}
        </a>
      </div>
    </main>
  );
}

/**
 * Null for every refusal, and the database being unreachable is one of them —
 * the front door must render on a bad day, which is the same reason `AppNav`
 * and `DemoBar` swallow this rather than taking the page down with them.
 */
async function readDemoSession(): Promise<{
  displayName: string;
  roles: readonly string[];
} | null> {
  const personaId = await readDemoPersonaIdFromStore();
  if (!personaId) return null;

  try {
    const session = await resolveDemoSession(personaId);
    if (!session) return null;
    return { displayName: session.displayName, roles: session.claims.roles };
  } catch {
    return null;
  }
}
