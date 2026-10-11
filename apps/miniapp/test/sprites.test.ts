import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_CHARACTER_SPRITES } from "../src/art/sprites/characters.ts";
import { ALL_ICON_SPRITES } from "../src/art/sprites/icons.ts";
import { HERO_GRIDS } from "../src/art/hero.ts";

describe("pixel sprites", () => {
  it("every row has the same width and every character has a color", () => {
    for (const [i, rows] of HERO_GRIDS.entries()) {
      for (const row of rows) assert.equal(row.length, rows[0]!.length, `hero grid #${i}: "${row}"`);
    }
    for (const [i, s] of [...ALL_CHARACTER_SPRITES, ...ALL_ICON_SPRITES].entries()) {
      const w = s.rows[0]!.length;
      s.rows.forEach((row, y) => {
        assert.equal(row.length, w, `sprite #${i} row ${y} is ${row.length} wide, expected ${w}: "${row}"`);
        for (const ch of row) if (ch !== "." && ch !== " ") assert.ok(s.palette[ch], `sprite #${i} uses "${ch}" without a color`);
      });
    }
  });
});
