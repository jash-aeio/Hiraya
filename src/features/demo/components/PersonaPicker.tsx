"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Avatar, Badge, Card, EmptyState, Spinner, cn } from "@/design";

import type { DemoSchool, Persona, PersonasResponse } from "../schema";

/**
 * The persona switcher (D23).
 *
 * A client component that talks to /api/v1 rather than a Server Component
 * reading the service directly, for one reason: every read and write goes
 * through one authorization path (CLAUDE.md R3). Reading the service here would
 * be a second way in, checked separately from the endpoint beside it.
 *
 * `fetch` rather than TanStack Query: two calls, no cache to invalidate, and a
 * dependency added for a Phase 0 demo screen is a dependency the 500 KB budget
 * pays for on every screen after it.
 *
 * Zod is deliberately absent from this file for the same reason, and it cost a
 * measurement to learn: parsing the response with the shared schema put the
 * whole of Zod in the client bundle and took /demo from 183 KB to 294 KB of
 * first load. The contract is still enforced where R7 asks for it — the handler
 * parses every request, and the types below are inferred from the same schema at
 * compile time, where they weigh nothing. What is left at runtime is the shallow
 * check below, which exists to fail loudly on a misshaped response rather than
 * to re-prove a contract the server already keeps.
 *
 * Staff register (D12): this is a utility surface, so it is calm. No medals, no
 * celebration — the learner playfulness belongs on the screens this switches
 * into, not on the door.
 */

type Status = "loading" | "ready" | "failed";

/** Shallow, and shallow on purpose: see the note above about the bundle. */
function isPersonasResponse(value: unknown): value is PersonasResponse {
  if (typeof value !== "object" || value === null) return false;
  const { schools } = value as { schools?: unknown };
  return (
    Array.isArray(schools) &&
    schools.every(
      (school) =>
        typeof school === "object" &&
        school !== null &&
        typeof (school as DemoSchool).schoolId === "string" &&
        Array.isArray((school as DemoSchool).personas),
    )
  );
}

export function PersonaPicker() {
  const t = useTranslations("demo");
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [schools, setSchools] = useState<DemoSchool[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await fetch("/api/v1/demo/personas");
        if (!response.ok) throw new Error(String(response.status));

        const body: unknown = await response.json();
        if (!isPersonasResponse(body)) throw new Error("malformed");
        if (!cancelled) {
          setSchools(body.schools);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = useCallback(
    async (profileId: string) => {
      setPending(profileId);
      try {
        const response = await fetch("/api/v1/demo/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profileId }),
        });
        if (!response.ok) throw new Error(String(response.status));

        // Both, in this order: push navigates, refresh discards the RSC payload
        // the router already holds. The DEMO DATA marker is rendered on the
        // server from the cookie, so without the refresh the new persona would
        // arrive on a page still describing the previous one.
        router.push("/");
        router.refresh();
      } catch {
        setPending(null);
        setStatus("failed");
      }
    },
    [router],
  );

  if (status === "loading") {
    return (
      <div className="flex justify-center py-10 text-ink-muted">
        <Spinner label={t("loading")} />
      </div>
    );
  }

  if (status === "failed") {
    return <EmptyState title={t("failedTitle")} description={t("failedBody")} />;
  }

  if (schools.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {schools.map((school) => (
        <section key={school.schoolId} className="flex flex-col gap-3">
          {/* Named even when there is only one: a demo whose tenant is invisible
              is a demo that cannot show what tenancy means. */}
          <h2 className="type-h3 text-ink">{school.name}</h2>
          <ul className="flex flex-col gap-2">
            {school.personas.map((persona) => (
              <li key={persona.profileId}>
                <PersonaRow
                  persona={persona}
                  busy={pending === persona.profileId}
                  disabled={pending !== null}
                  onChoose={() => void choose(persona.profileId)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PersonaRow({
  persona,
  busy,
  disabled,
  onChoose,
}: {
  persona: Persona;
  busy: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  const t = useTranslations("demo");
  const roleLabel = useTranslations("roles");

  const place =
    persona.gradeLevel !== null && persona.section !== null
      ? t("gradeSection", { grade: persona.gradeLevel, section: persona.section })
      : null;

  return (
    <Card elevation="flat" padding="none">
      <button
        type="button"
        onClick={onChoose}
        disabled={disabled}
        aria-busy={busy || undefined}
        className={cn(
          "flex w-full touch-target items-center gap-3 rounded-lg p-3 text-left",
          "transition-colors duration-[var(--duration-feedback)]",
          "hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {/* Decorative here: Avatar carries the name for screen readers, and the
            name is already the first thing in the button's label. Without this
            the button announces "Sinag Dagatan Sinag Dagatan". */}
        <span aria-hidden="true">
          <Avatar name={persona.displayName} />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="type-body-strong truncate text-ink">{persona.displayName}</span>
          {place ? <span className="type-small text-ink-muted">{place}</span> : null}
          <span className="flex flex-wrap gap-1.5">
            {persona.roles.map((role) => (
              <Badge key={role} tone="neutral">
                {roleLabel(role)}
              </Badge>
            ))}
          </span>
        </span>
        <span className="ml-auto shrink-0 pl-2">
          {busy ? <Spinner size="sm" /> : <span className="type-small text-primary-ink">{t("viewAs")}</span>}
        </span>
      </button>
    </Card>
  );
}
