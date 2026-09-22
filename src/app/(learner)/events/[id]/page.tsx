import { registerAttrs } from "@/design";
import { EventDetailScreen } from "@/features/events/components/EventDetailScreen";

/**
 * /events/[id] — one event, and the decision to go (P-01, FR-3.3, US-2).
 *
 * The shell is a Server Component and the screen inside it is a client one, for
 * the same split as /events: the shell is static and belongs in the first
 * paint, while the screen fetches, registers and has to work inside a Capacitor
 * bundle with no server behind it (CLAUDE.md R3).
 *
 * There is no `notFound()` here and no server-side read to base one on. An event
 * in another school is invisible to the policy, not to the router, and the
 * screen renders the same "we could not find that" for both — which is the
 * behaviour src/lib/errors.ts asks for, since distinguishing them would confirm
 * that a given event exists somewhere in the system.
 */
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main
      {...registerAttrs("learner")}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8"
    >
      <EventDetailScreen eventId={id} />
    </main>
  );
}
