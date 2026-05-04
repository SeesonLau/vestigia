// components/thermal/footAsset.ts
//
// Optional plantar-foot illustration used as the background of the
// angiosome map. When this module exports null, FootAngiosomeDiagram
// falls back to a built-in hand-drawn SVG silhouette.
//
// To plug in your own drawing:
//   1. Save the image as a PNG with a transparent background.
//   2. Orient it as a RIGHT foot, plantar (sole) view, with toes pointing UP.
//      The diagram will mirror it horizontally to render the LEFT foot.
//   3. Place it at  assets/images/foot-plantar.png
//   4. Uncomment the `require(...)` line below.
//   5. (Optional) Tune ANGIO_BOX_NORM if your drawing's foot body sits at
//      different proportions from the default. Coordinates are normalized
//      [0..1] over the image:
//        x, y = top-left corner of the four-angiosome bounding box
//        w, h = box size (excludes the toe area above and the heel base
//               below the angiosome region)
//
// Recommended image size: at least 240 x 600 px for crisp rendering on
// high-density screens.

import type { ImageSourcePropType } from "react-native";

export const FOOT_PLANTAR: ImageSourcePropType | null = null;
// export const FOOT_PLANTAR: ImageSourcePropType | null =
//   require("../../assets/images/foot-plantar.png");

/**
 * Bounding box of the four-angiosome region inside the image, in
 * normalized [0..1] image coords. Default tuned for an image where the
 * toe pad occupies the top ~18% and the heel ends at the very bottom.
 * Adjust if your drawing has different proportions.
 */
export const ANGIO_BOX_NORM = {
  x: 0.06,   // left edge of the angiosome box
  y: 0.18,   // just below the toes
  w: 0.88,   // width of the angiosome box
  h: 0.78,   // ends near the bottom of the heel
} as const;
