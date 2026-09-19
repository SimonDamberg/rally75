import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { KUSK_PHOTOS, NAMED_KUSKAR, kuskPhoto } from "./kuskar";

const PUBLIC = join(import.meta.dirname, "..", "..", "..", "public");

describe("kusk photos", () => {
  it("gives every kusk in the stable a face", () => {
    for (const k of NAMED_KUSKAR) expect(kuskPhoto(k.name), k.name).toBeDefined();
  });

  it("points every entry at a committed file", () => {
    for (const [name, src] of Object.entries(KUSK_PHOTOS)) {
      expect(existsSync(join(PUBLIC, src)), name).toBe(true);
    }
  });

  it("falls back for a kusk without a photo", () => {
    expect(kuskPhoto("Travpensionären Bengt")).toBeUndefined();
    expect(kuskPhoto("toString")).toBeUndefined();
  });
});
