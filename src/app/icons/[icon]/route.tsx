import { ImageResponse } from "next/og";

import { BRAND_TEAL, logomarkDataUri } from "@/design/art/logomarkDataUri";

/**
 * The PWA manifest icons (ASSET_CHECKLIST 1.1).
 *
 * These are route handlers rather than Next's `icon` file convention because a
 * manifest needs *stable* URLs and the file convention appends a content hash.
 * Prerendered by `generateStaticParams`, so they cost a build step and no
 * request-time work.
 *
 * `maskable-512` carries the 20% safe zone Android's adaptive-icon crop
 * requires: the mark sits at 60% of the canvas, so any mask shape — circle,
 * squircle, teardrop — still contains the whole chevron.
 */

type Spec = { size: number; scale: number };

const ICONS: Record<string, Spec> = {
  "pwa-192.png": { size: 192, scale: 1 },
  "pwa-512.png": { size: 512, scale: 1 },
  "maskable-512.png": { size: 512, scale: 0.6 },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((icon) => ({ icon }));
}

export const dynamicParams = false;

export async function GET(_request: Request, ctx: { params: Promise<{ icon: string }> }) {
  const { icon } = await ctx.params;
  const spec = ICONS[icon];
  if (!spec) return new Response("Not found", { status: 404 });

  const inner = Math.round(spec.size * spec.scale);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: BRAND_TEAL,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logomarkDataUri({ background: BRAND_TEAL })}
          width={inner}
          height={inner}
          alt=""
        />
      </div>
    ),
    { width: spec.size, height: spec.size },
  );
}
