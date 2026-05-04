// components/thermal/footAsset.ts
//
// Optional plantar-foot illustrations used as the background of the
// angiosome map. When BOTH exports are null, FootAngiosomeDiagram falls
// back to its built-in hand-drawn SVG silhouette.
//
// To plug in your own drawings:
//   1. Save each image as a PNG with a transparent background.
//   2. Orient them as plantar (sole) view, toes pointing UP. The
//      component renders each foot's image without mirroring -- so
//      _L should be the left foot's view and _R the right foot's.
//   3. Place them at:
//          assets/images/foot-plantar_L.png
//          assets/images/foot-plantar_R.png
//   4. (Optional) Tune ANGIO_BOX_NORM if your drawings' foot bodies
//      sit at different proportions from the default. Coordinates are
//      normalized [0..1] over the image:
//        x, y = top-left corner of the four-angiosome bounding box
//        w, h = box size (excludes the toe area above and the heel
//               base below the angiosome region)
//
// Recommended size: at least 240 x 600 px for crisp rendering.

import type { ImageSourcePropType } from "react-native";

export const FOOT_PLANTAR_LEFT:  ImageSourcePropType | null =
  require("../../assets/images/foot-plantar_L.png");

export const FOOT_PLANTAR_RIGHT: ImageSourcePropType | null =
  require("../../assets/images/foot-plantar_R.png");

/**
 * Bounding box of the four-angiosome region inside the image, in
 * normalized [0..1] image coords.
 *
 * Default tuned for a SQUARE 1000x1000 PNG where the foot is centered
 * and occupies roughly the middle 60% of the width with toes near the
 * top. Adjust if your drawing's proportions differ:
 *   x  = left edge of the four-region box (inside the foot's left edge)
 *   y  = top edge — just below the toe pads
 *   w  = box width (matches the foot body's width, not the full image)
 *   h  = box height (down to the heel base)
 */
export const ANGIO_BOX_NORM = {
  x: 0.22,
  y: 0.22,
  w: 0.56,
  h: 0.66,
} as const;
