// components/thermal/ProcessedThermalView.tsx
import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { ThermalMatrix } from "../../lib/thermal/preprocessing";
import { BinaryMatrix, cannyEdges, chanVese, otsuThreshold } from "../../lib/thermal/imageProcessing";

export type ViewMode = "original" | "otsu" | "chanvese" | "canny";

interface Props {
  matrix: ThermalMatrix;
  mode: Exclude<ViewMode, "original">;
  width: number;
  height: number;
}

// Renders a binary matrix as a 2-tone SVG image.
// Uses run-length encoding per row to reduce the number of SVG elements.
function BinaryView({
  binary,
  width,
  height,
  onColor,
  offColor,
}: {
  binary: BinaryMatrix;
  width: number;
  height: number;
  onColor: string;
  offColor: string;
}) {
  const rows = binary.length;
  const cols = binary[0]?.length ?? 0;
  const cellW = width / cols;
  const cellH = height / rows;

  const rects = useMemo(() => {
    const result: { x: number; y: number; w: number; h: number; color: string }[] = [];
    for (let r = 0; r < rows; r++) {
      let c = 0;
      while (c < cols) {
        const val = binary[r][c];
        let runEnd = c + 1;
        while (runEnd < cols && binary[r][runEnd] === val) runEnd++;
        result.push({
          x: c * cellW,
          y: r * cellH,
          w: (runEnd - c) * cellW + 0.5,
          h: cellH + 0.5,
          color: val ? onColor : offColor,
        });
        c = runEnd;
      }
    }
    return result;
  }, [binary, width, height]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {rects.map((rect, i) => (
          <Rect key={i} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={rect.color} />
        ))}
      </Svg>
    </View>
  );
}

export default function ProcessedThermalView({ matrix, mode, width, height }: Props) {
  const otsu = useMemo(
    () => (mode === "otsu" ? otsuThreshold(matrix) : null),
    [matrix, mode]
  );

  const chanvese = useMemo(
    () => (mode === "chanvese" ? chanVese(matrix, 50) : null),
    [matrix, mode]
  );

  const canny = useMemo(
    () => (mode === "canny" ? cannyEdges(matrix) : null),
    [matrix, mode]
  );

  if (mode === "otsu" && otsu) {
    return (
      <BinaryView
        binary={otsu}
        width={width}
        height={height}
        onColor="rgb(255,255,255)"  // foot = white
        offColor="rgb(0,0,0)"       // background = black
      />
    );
  }

  if (mode === "chanvese" && chanvese) {
    return (
      <BinaryView
        binary={chanvese}
        width={width}
        height={height}
        onColor="rgb(77,217,192)"   // foot = teal (app accent)
        offColor="rgb(5,13,26)"     // background = app dark
      />
    );
  }

  if (mode === "canny" && canny) {
    return (
      <BinaryView
        binary={canny}
        width={width}
        height={height}
        onColor="rgb(255,220,0)"    // edges = yellow
        offColor="rgb(0,0,0)"       // background = black
      />
    );
  }

  return <View style={{ width, height }} />;
}
