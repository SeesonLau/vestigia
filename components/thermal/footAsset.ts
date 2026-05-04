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
