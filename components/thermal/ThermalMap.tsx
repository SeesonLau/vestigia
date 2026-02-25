// components/thermal/ThermalMap.tsx
import React, { useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Svg, { Rect } from "react-native-svg";

interface ThermalMapProps {
  matrix: number[][]; // [62][80]
  minTemp: number;
  maxTemp: number;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

// Iron colormap — classic thermal camera palette
function tempToColor(normalized: number): string {
  // Clamp
  const t = Math.max(0, Math.min(1, normalized));

  // Stops: black → purple → red → orange → yellow → white
  const stops = [
    [0, 0, 0], // 0.0 - black
    [80, 0, 120], // 0.2 - deep purple
    [200, 0, 60], // 0.45 - red
    [255, 100, 0], // 0.65 - orange
    [255, 220, 0], // 0.85 - yellow
    [255, 255, 200], // 1.0 - near white
  ];
  const positions = [0, 0.2, 0.45, 0.65, 0.85, 1.0];

  let i = 0;
  while (i < positions.length - 1 && t > positions[i + 1]) i++;

  const lo = positions[i];
  const hi = positions[i + 1];
  const f = (t - lo) / (hi - lo);

  const r = Math.round(stops[i][0] + f * (stops[i + 1][0] - stops[i][0]));
  const g = Math.round(stops[i][1] + f * (stops[i + 1][1] - stops[i][1]));
  const b = Math.round(stops[i][2] + f * (stops[i + 1][2] - stops[i][2]));

  return `rgb(${r},${g},${b})`;
}

export default function ThermalMap({
  matrix,
  minTemp,
  maxTemp,
  width = 320,
  height = 248,
  style,
}: ThermalMapProps) {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const cellW = width / cols;
  const cellH = height / rows;
  const range = maxTemp - minTemp || 1;

  const cells = useMemo(() => {
    const result: {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
    }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const normalized = (matrix[r][c] - minTemp) / range;
        result.push({
          x: c * cellW,
          y: r * cellH,
          w: cellW + 0.5, // slight overlap to prevent gaps
          h: cellH + 0.5,
          color: tempToColor(normalized),
        });
      }
    }
    return result;
  }, [matrix, minTemp, maxTemp]);

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height}>
        {cells.map((cell, i) => (
          <Rect
            key={i}
            x={cell.x}
            y={cell.y}
            width={cell.w}
            height={cell.h}
            fill={cell.color}
          />
        ))}
      </Svg>
    </View>
  );
}

// Mock data generator for UI preview
export function generateMockThermalMatrix(rows = 62, cols = 80): number[][] {
  const matrix: number[][] = [];
  const centerR = rows / 2;
  const centerC = cols / 2;

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      const dist = Math.sqrt((r - centerR) ** 2 + (c - centerC) ** 2);
      const base = 32 - dist * 0.15;
      const noise = (Math.random() - 0.5) * 1.2;
      row.push(Math.max(28, Math.min(38, base + noise)));
    }
    matrix.push(row);
  }
  return matrix;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    overflow: "hidden",
  },
});
