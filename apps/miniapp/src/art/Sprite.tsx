import type { CSSProperties } from "react";
import { height, spriteUrl, width, type Sprite } from "./pixel.ts";

/** A sprite as an <img>, scaled by an integer factor so every pixel stays square. */
export function SpriteImg({ sprite, scale = 2, flip, style, className }: { sprite: Sprite; scale?: number; flip?: boolean; style?: CSSProperties; className?: string }) {
  return (
    <img
      className={`px ${className ?? ""}`}
      src={spriteUrl(sprite)}
      width={width(sprite) * scale}
      height={height(sprite) * scale}
      alt=""
      draggable={false}
      style={{ transform: flip ? "scaleX(-1)" : undefined, ...style }}
    />
  );
}
