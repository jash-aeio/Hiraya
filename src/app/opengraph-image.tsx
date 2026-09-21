import { ImageResponse } from "next/og";

import { BRAND_TEAL, logomarkDataUri } from "@/design/art/logomarkDataUri";

/**
 * The Facebook and Messenger share card (FR-6.3, ASSET_CHECKLIST 1.1).
 *
 * Those two are where a Philippine public-school announcement actually travels,
 * so a share that renders as a grey box is a feature that does not work.
 *
 * The type here is Satori's bundled default, not Plus Jakarta Sans: `next/font`
 * hands us a hashed build artefact rather than a file path, and Satori needs a
 * real TTF. Vendoring one is a ~200 KB commit and its own decision — logged in
 * ASSET_CHECKLIST 1.1 rather than taken quietly. The mark and the palette carry
 * the brand until then.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Hiraya — school engagement, verified at the gate";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: BRAND_TEAL,
          padding: 88,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logomarkDataUri({ background: "#ffffff", mark: BRAND_TEAL })}
            width={104}
            height={104}
            alt=""
          />
          {/* Satori requires an explicit display on any node with more than one
              child, so the amber full stop gets its own flex row rather than
              sitting as a sibling of a bare text node. */}
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: -2,
            }}
          >
            <span>hiraya</span>
            <span style={{ color: "#f5a524" }}>.</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 56, color: "#ffffff", lineHeight: 1.2, maxWidth: 940 }}>
            A point means a teacher confirmed you were there.
          </div>
          <div style={{ fontSize: 30, color: "#a7e0dd" }}>
            Events, verified check-in, and a record of everything you joined.
          </div>
        </div>

        <div style={{ display: "flex", height: 14, gap: 12 }}>
          <div style={{ flex: 1, background: "#f5a524", borderRadius: 7 }} />
          <div style={{ flex: 1, background: "#a7e0dd", borderRadius: 7 }} />
          <div style={{ flex: 2, background: "#0a6a67", borderRadius: 7 }} />
        </div>
      </div>
    ),
    size,
  );
}
