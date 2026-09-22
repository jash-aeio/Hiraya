import type { EventDetail } from "../schema";

/**
 * Fixture data for the event detail screen, loaded only when
 * `NEXT_PUBLIC_HIRAYA_FIXTURES=on` (src/lib/fixtures.ts) and imported
 * dynamically so an unset deployment never fetches this chunk.
 *
 * **Deleted with D-01.** Until then it is what makes P-01's five states
 * reachable — including the three that a seeded database cannot produce on
 * demand, because they depend on who is asking and how full the event already
 * is. Pick one with `?preview=`:
 *
 *   /events/<id>             the open case
 *   /events/<id>?preview=full
 *   /events/<id>?preview=ineligible
 *   /events/<id>?preview=registered
 *   /events/<id>?preview=waitlisted
 *   /events/<id>?preview=closed
 *
 * Every name here is invented, as everything in a demo tenant is (CLAUDE.md §6).
 */

export const PREVIEW_VARIANTS = [
  "open",
  "full",
  "ineligible",
  "registered",
  "waitlisted",
  "closed",
] as const;

export type PreviewVariant = (typeof PREVIEW_VARIANTS)[number];

export function isPreviewVariant(value: string | null): value is PreviewVariant {
  return value !== null && (PREVIEW_VARIANTS as readonly string[]).includes(value);
}

const ORG_ID = "11111111-1111-4111-8111-111111111111";

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export function fixtureEventDetail(id: string, variant: PreviewVariant): EventDetail {
  const base: EventDetail = {
    id,
    title: "Coastal clean-up drive",
    description:
      "Meet at the covered court. Bring gloves if you have them; the club has spares. " +
      "We walk to the shoreline together and are back before lunch.",
    startsAt: hoursFromNow(30),
    endsAt: hoursFromNow(34),
    venue: "Covered court, then the shoreline",
    capacity: 40,
    status: "approved",
    org: {
      id: ORG_ID,
      name: "Science Club",
      category: "service",
      logoKey: null,
    },
    viewerRegistrationStatus: null,
    eligibility: { gradeLevels: [], sections: [], orgIds: [] },
    registrationOpen: true,
    viewerRegistration: null,
  };

  switch (variant) {
    case "ineligible":
      return {
        ...base,
        title: "Senior high debate clinic",
        description:
          "Two rounds of practice debate with the coaches, followed by feedback. " +
          "Bring a notebook.",
        venue: "Room 204",
        capacity: null,
        eligibility: { gradeLevels: [11, 12], sections: [], orgIds: [] },
      };
    case "registered":
      return {
        ...base,
        viewerRegistrationStatus: "registered",
        viewerRegistration: {
          status: "registered",
          waitlistPosition: null,
          registeredAt: hoursFromNow(-18),
        },
      };
    case "waitlisted":
      return {
        ...base,
        viewerRegistrationStatus: "waitlisted",
        viewerRegistration: {
          status: "waitlisted",
          waitlistPosition: 3,
          registeredAt: hoursFromNow(-2),
        },
      };
    case "closed":
      return {
        ...base,
        title: "Intramurals opening parade",
        description: "The parade forms at the gate and circles the quadrangle before the opening rites.",
        venue: "Quadrangle",
        startsAt: hoursFromNow(-52),
        endsAt: hoursFromNow(-48),
        registrationOpen: false,
      };
    case "full":
    case "open":
    default:
      return base;
  }
}
