import { ImageResponse } from "next/og";

import { BRAND_TEAL, logomarkDataUri } from "@/design/art/logomarkDataUri";

/**
 * The Apple touch icon (ASSET_CHECKLIST 1.1). PNG, 180x180, and deliberately
 * opaque: iOS composites a transparent touch icon onto black, which turns the
 * mark into a dark smear on the home screen.
 *
 * Generated rather than committed as a raster, so it cannot drift from
 * `src/app/icon.svg`. No text, so no font has to be vendored for Satori.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <img src={logomarkDataUri({ background: BRAND_TEAL })} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
