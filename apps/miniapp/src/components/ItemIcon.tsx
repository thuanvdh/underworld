import type { Item, Slot } from "@underworld/shared";
import { ICONS, itemSprite } from "../art/sprites/icons.ts";
import { SpriteImg } from "../art/Sprite.tsx";

const SCALE = { sm: 2, md: 3, lg: 4 } as const;

/**
 * Item in its rarity frame (Art Style Tile): common square border, uncommon cut corner, rare double border,
 * epic double border with gem studs, legendary flame border with a crown. Readable in grayscale.
 */
export function ItemIcon({ item, slot, size = "md" }: { item?: Item | null; slot?: Slot; size?: "sm" | "md" | "lg" }) {
  if (!item) {
    return (
      <div className={`frame f-empty ${size}`}>
        {slot && <SpriteImg sprite={itemSprite(slot)} scale={SCALE[size]} />}
      </div>
    );
  }
  const legendary = item.rarity === "legendary";
  return (
    <div className={`frame f-${item.rarity} ${size}`}>
      {item.rarity === "epic" && (
        <>
          <i className="stud" />
          <i className="stud" />
          <i className="stud" />
          <i className="stud" />
        </>
      )}
      {legendary && <SpriteImg sprite={ICONS.crown} scale={2} className="crown" />}
      <SpriteImg sprite={itemSprite(item.slot, legendary)} scale={SCALE[size]} />
      {item.enhance > 0 && <span className="enh">+{item.enhance}</span>}
    </div>
  );
}
