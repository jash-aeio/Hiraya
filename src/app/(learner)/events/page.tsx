import { getTranslations } from "next-intl/server";

import { registerAttrs } from "@/design";
import { EventList } from "@/features/events/components/EventList";

/**
 * /events — browse what is on, the first screen of the walkable loop
 * (FR-3.2, FR-3.3).
 *
 * The page shell is a Server Component and the list is a client one: the shell
 * is static and belongs in the first paint, while the list filters and refetches
 * and has to work inside a Capacitor bundle with no server behind it (R3).
 *
 * There is no `status` filter anywhere in this feature, and that is the point.
 * "An event is invisible to learners until it is approved" lives in the SELECT
 * policy on `events`, so an officer opening this same screen sees their own
 * org's drafts and a learner does not, without either case being written here.
 */
export default async function EventsPage() {
  const t = await getTranslations("events");

  return (
    <main
      {...registerAttrs("learner")}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8"
    >
      <header className="flex flex-col gap-1">
        <p className="type-label text-ink-muted">{t("label")}</p>
        <h1 className="type-h1 text-ink">{t("title")}</h1>
        <p className="type-body text-ink-muted">{t("intro")}</p>
      </header>

      <EventList />
    </main>
  );
}
