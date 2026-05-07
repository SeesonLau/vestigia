-- 2026-05-07 — Add feed_mode column + relax processed_image_path NOT NULL.
--
-- Captures now ship in one of two pipeline shapes (controlled by the new
-- in-app "Feed" toggle on the capture screen):
--
--   feed_mode = 'unprocessed' (default, legacy behaviour)
--     [raw_image_path]       grayscale unprocessed render
--     [processed_image_path] palette-mapped processed image
--     [isolated_image_path]  isolated foot (background removed)
--
--   feed_mode = 'processed' (new)
--     [raw_image_path]       palette-mapped processed image, full frame
--     [processed_image_path] same processed image cropped to the framing
--                            rectangle. NULL when no rectangle was drawn.
--     [isolated_image_path]  isolated foot (background removed)
--
-- The slot mapping in storage stays identical so existing rows render
-- correctly under the default 'unprocessed' value. The middle slot must be
-- nullable to support 'processed' captures with no ROI.

ALTER TABLE thermal_captures
  ADD COLUMN feed_mode TEXT NOT NULL DEFAULT 'unprocessed'
    CHECK (feed_mode IN ('unprocessed','processed'));

ALTER TABLE thermal_captures
  ALTER COLUMN processed_image_path DROP NOT NULL;
