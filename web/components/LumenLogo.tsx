// web/components/LumenLogo.tsx
// LumenAI brand mark. Same SVG the mobile app ships as the launcher icon
// (assets/images/lumen-icon.svg, copied to /public/lumen-icon.svg).

import Image from "next/image";

export function LumenLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/lumen-icon.svg"
      alt="LumenAI"
      width={size}
      height={size}
      priority
      className={"select-none rounded-[22%] " + className}
      style={{ width: size, height: size }}
    />
  );
}
