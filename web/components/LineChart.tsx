// web/components/LineChart.tsx
// Inline SVG line chart for the admin dashboard. Renders one or more
// numeric series against a shared day-indexed x-axis. Designed for
// time-series traffic charts (e.g. tickets opened vs resolved per day);
// not a general-purpose plotting library.
//
// Why inline SVG and not a chart library: the rest of the admin web
// console is dependency-light (Next.js + Tailwind only) and the data
// shapes here are small. A 200-line SVG keeps the bundle small and
// matches the existing visual language.

"use client";

import { useMemo, useState } from "react";

export interface LineSeries {
  label: string;
  values: number[];
  /** Tailwind text-color class for the swatch + label, e.g. "text-teal-600". */
  textClass: string;
  /** SVG stroke colour for the line + dots. */
  stroke: string;
  /** Optional dash array for the line (omit for solid). */
  dash?: string;
}

interface Props {
  /** X-axis labels — one per data point. */
  xLabels:  string[];
  /** Series to plot. All must have the same length as `xLabels`. */
  series:   LineSeries[];
  /** Plot height in px (svg height; width is responsive). */
  height?:  number;
  /** Number of x-axis labels to render (others are tick marks only). */
  xTicks?:  number;
}

const MARGIN = { top: 20, right: 16, bottom: 28, left: 36 };

export default function LineChart({
  xLabels,
  series,
  height = 220,
  xTicks = 6,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);

  // Use a fixed viewBox width so SVG scales responsively while keeping
  // the same proportions. 720 is wide enough for ~30 day ticks without
  // labels colliding.
  const VBW = 720;
  const VBH = height;
  const plotW = VBW - MARGIN.left - MARGIN.right;
  const plotH = VBH - MARGIN.top  - MARGIN.bottom;

  const n = xLabels.length;
  const yMax = useMemo(() => {
    const m = Math.max(1, ...series.flatMap((s) => s.values));
    // Round up to the next nice tick so the top of the chart breathes.
    const exp  = Math.pow(10, Math.max(0, Math.floor(Math.log10(m)) - 1));
    const step = exp * 2;
    return Math.ceil((m + step / 2) / step) * step;
  }, [series]);

  const xAt = (i: number) => MARGIN.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => MARGIN.top + plotH - (v / yMax) * plotH;

  // Horizontal gridlines at 0, ¼, ½, ¾, 1.
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => {
    const value = yMax * (1 - p);
    return { y: MARGIN.top + p * plotH, value };
  });

  // X-axis tick indices — first, last, and evenly-spaced labels in between.
  const tickIndices = useMemo(() => {
    if (n <= xTicks) return Array.from({ length: n }, (_, i) => i);
    const out: number[] = [];
    for (let i = 0; i < xTicks; i++) {
      out.push(Math.round((i / (xTicks - 1)) * (n - 1)));
    }
    return Array.from(new Set(out)).sort((a, b) => a - b);
  }, [n, xTicks]);

  // Build a polyline path for each series.
  const pathFor = (s: LineSeries) =>
    s.values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`)
      .join(" ");

  // Map an x-pixel position back to the nearest data-point index. Used
  // for the hover-over tooltip — we attach a single mousemove handler
  // to a transparent overlay rect, find the nearest index, and read
  // each series's value at that index.
  const onMove = (clientX: number, currentTarget: SVGRectElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const xWithinSvg = ((clientX - rect.left) / rect.width) * VBW;
    if (xWithinSvg < MARGIN.left || xWithinSvg > VBW - MARGIN.right) {
      setHover(null);
      return;
    }
    const i = Math.round(((xWithinSvg - MARGIN.left) / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        preserveAspectRatio="none"
        className="w-full overflow-visible"
        style={{ height }}
      >
        {/* Y-axis gridlines + labels */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={MARGIN.left}  y1={g.y}
              x2={VBW - MARGIN.right} y2={g.y}
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 6}
              y={g.y}
              dy="0.35em"
              textAnchor="end"
              fill="currentColor"
              fillOpacity={0.55}
              fontSize={10}
              className="font-mono"
            >
              {Math.round(g.value)}
            </text>
          </g>
        ))}

        {/* X-axis ticks + labels */}
        {tickIndices.map((i) => (
          <g key={i}>
            <line
              x1={xAt(i)} y1={MARGIN.top + plotH}
              x2={xAt(i)} y2={MARGIN.top + plotH + 4}
              stroke="currentColor"
              strokeOpacity={0.3}
            />
            <text
              x={xAt(i)}
              y={MARGIN.top + plotH + 16}
              textAnchor="middle"
              fill="currentColor"
              fillOpacity={0.55}
              fontSize={10}
              className="font-mono"
            >
              {formatXLabel(xLabels[i])}
            </text>
          </g>
        ))}

        {/* Series lines */}
        {series.map((s, si) => (
          <g key={si}>
            <path
              d={pathFor(s)}
              fill="none"
              stroke={s.stroke}
              strokeWidth={2}
              strokeDasharray={s.dash}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Point markers */}
            {s.values.map((v, i) => (
              <circle
                key={i}
                cx={xAt(i)}
                cy={yAt(v)}
                r={hover === i ? 4 : 2.5}
                fill={s.stroke}
              />
            ))}
          </g>
        ))}

        {/* Hover vertical line */}
        {hover !== null && (
          <line
            x1={xAt(hover)} y1={MARGIN.top}
            x2={xAt(hover)} y2={MARGIN.top + plotH}
            stroke="currentColor"
            strokeOpacity={0.25}
            strokeDasharray="3 3"
          />
        )}

        {/* Mouse-tracking overlay */}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={plotW}
          height={plotH}
          fill="transparent"
          onMouseMove={(e) => onMove(e.clientX, e.currentTarget)}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {/* Legend */}
      <ul className="mt-2 flex flex-wrap gap-3 text-xs">
        {series.map((s, i) => (
          <li key={i} className={"flex items-center gap-1.5 " + s.textClass}>
            <span
              className="inline-block h-2 w-4 rounded-sm"
              style={s.dash ? {
                backgroundImage: `repeating-linear-gradient(90deg, ${s.stroke} 0 4px, transparent 4px 7px)`,
              } : {
                backgroundColor: s.stroke,
              }}
            />
            <span className="font-medium">{s.label}</span>
          </li>
        ))}
      </ul>

      {/* Tooltip */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          style={{
            left: `calc(${(xAt(hover) / VBW) * 100}% + 4px)`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-mono text-zinc-600 dark:text-zinc-300">
            {formatXLabel(xLabels[hover], true)}
          </div>
          <ul className="mt-0.5 space-y-0.5">
            {series.map((s, si) => (
              <li key={si} className={"flex items-center gap-1.5 " + s.textClass}>
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: s.stroke }}
                />
                <span className="font-medium">{s.label}</span>
                <span className="ml-1 tabular-nums">{s.values[hover]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatXLabel(raw: string, withYear = false): string {
  // The server returns days as "YYYY-MM-DD 00:00:00+00" (timestamp with
  // tz) or "YYYY-MM-DD" (date), depending on cast path. Strip the time
  // portion before parsing so the local timezone doesn't shift the day.
  const datePart = raw.slice(0, 10);
  const d = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  if (withYear) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
