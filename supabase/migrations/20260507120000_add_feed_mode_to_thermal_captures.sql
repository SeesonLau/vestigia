-- 2026-05-07 — Add feed_mode column + relax processed_image_path NOT NULL.
-- 2026-05-08 — Updated docstring: slot semantics are now SYMMETRIC across
-- feed_mode. Only the underlying matrix changes (Raw 160x120 vs Enhanced
-- 320x240); the (full, cropped, isolated) slot shape is identical:
--
--   feed_mode = 'unprocessed'  (= Raw mode)
--     [raw_image_path]       palette full frame, native 160x120 unenhanced
--     [processed_image_path] same palette image cropped to the framing
--                            rectangle. NULL when no rectangle was drawn.
--     [isolated_image_path]  isolated foot, cropped to ROI when one is set
--
--   feed_mode = 'processed'    (= Enhanced mode)
--     [raw_image_path]       palette full frame, 320x240 with CLAHE +
--                            unsharp + emissivity correction
--     [processed_image_path] same palette image cropped to the framing
--                            rectangle. NULL when no rectangle was drawn.
--     [isolated_image_path]  isolated foot, cropped to ROI when one is set
--
-- The middle slot must be nullable in both modes to support captures with
-- no ROI. Pre-2026-05-08 'unprocessed' rows used a different layout
-- (grayscale slot 1, always-present palette slot 2) — those legacy rows
-- still display in the bundle viewer but slot 1 will look grayscale.

ALTER TABLE thermal_captures
  ADD COLUMN feed_mode TEXT NOT NULL DEFAULT 'unprocessed'
    CHECK (feed_mode IN ('unprocessed','processed'));

ALTER TABLE thermal_captures
  ALTER COLUMN processed_image_path DROP NOT NULL;
