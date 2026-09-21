/**
 * `server-only` throws on import outside a React Server Component, which is the
 * whole point of it — and it means a unit test cannot import a service, a query
 * module, or the session plumbing without this stub standing in for it.
 *
 * Aliased in vitest.config.ts. It weakens nothing: the guard exists to stop a
 * *bundler* pulling server code into a client bundle, and `next build` still
 * enforces that against the real module.
 */
export {};
