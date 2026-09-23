import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ZodType } from "zod";

import { requireRole, requireSession } from "@/lib/auth/session";
import type { Session } from "@/lib/auth/session";
import { HirayaError, isHirayaError, toHttpStatus } from "@/lib/errors";
import { log } from "@/lib/log";

/**
 * The one shape every /api/v1 handler has (CLAUDE.md R3, R7):
 *
 *   authenticate -> authorize(role) -> Zod-parse -> call service -> map errors
 *
 * Route handlers are thin because the business logic lives once, in the service.
 * Duplicating it anywhere would duplicate the authorization checks with it, and
 * the copy is the one that rots. There are no Server Actions to diverge into.
 *
 * Every step here is deliberate:
 *   - `input` is required for any route with a body, so no unparsed value ever
 *     reaches a service.
 *   - errors are mapped in exactly one place, so a service never learns about
 *     HTTP and cannot leak a status-code decision into a business rule.
 *   - the failure log carries the error code and the profile id, never the
 *     request body: bodies contain names.
 */

export interface RouteContext<TInput, TParams> {
  session: Session;
  input: TInput;
  request: Request;
  params: TParams;
}

export interface RouteDefinition<TInput, TOutput, TParams> {
  /** Roles permitted to call this route. Empty means any authenticated user. */
  roles?: string[];
  /** Zod schema for the request body or search params. Omit for no input. */
  input?: ZodType<TInput>;
  /**
   * Zod schema for the dynamic route segments. A path parameter is client input
   * like any other — `/events/<anything>/register` reaches this handler — so R7
   * applies to it, and parsing it here means no route re-implements the check
   * and none of them forgets. Omit on a route with no dynamic segment.
   */
  params?: ZodType<TParams>;
  /** Set true only for genuinely public endpoints (activation, login, health). */
  public?: boolean;
  handler: (ctx: RouteContext<TInput, TParams>) => Promise<TOutput>;
}

type NextRouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

export function defineRoute<TInput, TOutput, TParams = Record<string, string>>(
  definition: RouteDefinition<TInput, TOutput, TParams>,
): NextRouteHandler {
  return async function route(request, context) {
    let session: Session | null = null;

    try {
      if (!definition.public) {
        session = await requireSession(request);
        if (definition.roles?.length) {
          requireRole(session, ...definition.roles);
        }
      }

      const input = definition.input
        ? definition.input.parse(await readInput(request))
        : (undefined as TInput);

      const rawParams = (await context.params) ?? {};
      const params = definition.params
        ? definition.params.parse(rawParams)
        : (rawParams as TParams);

      const result = await definition.handler({
        // A public route has no session; the type is honest about the cast being
        // the route author's responsibility, not a silent `any`.
        session: session as Session,
        input,
        request,
        params,
      });

      return NextResponse.json(result satisfies TOutput, { status: 200 });
    } catch (error: unknown) {
      return errorResponse(error, session);
    }
  };
}

async function readInput(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") {
    return Object.fromEntries(new URL(request.url).searchParams);
  }
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HirayaError("VALIDATION_FAILED", "Request body is not valid JSON");
  }
}

export function errorResponse(error: unknown, session: Session | null): NextResponse {
  if (error instanceof ZodError) {
    // Field paths and codes only. Zod's messages can echo the submitted value,
    // and a submitted value can be a learner's name.
    const fields = error.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.code,
    }));
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", details: { fields } } },
      { status: toHttpStatus("VALIDATION_FAILED") },
    );
  }

  if (isHirayaError(error)) {
    const status = toHttpStatus(error.code);
    if (status >= 500) {
      log.error("api.error", { code: error.code, profile_id: session?.profileId });
    }
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status },
    );
  }

  log.error("api.unhandled", {
    profile_id: session?.profileId,
    // The message may name a constraint or a column; it never carries the body.
    reason: error instanceof Error ? error.message : "unknown",
  });
  return NextResponse.json({ error: { code: "INTERNAL" } }, { status: 500 });
}
