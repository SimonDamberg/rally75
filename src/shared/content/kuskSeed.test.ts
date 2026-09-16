import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NAMED_KUSKAR } from "./kuskar";

const MIGRATIONS = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "supabase",
  "migrations",
);
const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`;

describe("kusk seed migration", () => {
  // Migrations are append-only, so the roster lives in the newest seed file; earlier ones are
  // history. Filenames are date-prefixed, so sorting puts the current one last.
  it("contains every kusk name, title and note", () => {
    const file = readdirSync(MIGRATIONS)
      .filter((f) => f.includes("_kusk_seed"))
      .sort()
      .pop();
    expect(file).toBeDefined();
    const sql = readFileSync(join(MIGRATIONS, file!), "utf8");
    for (const k of NAMED_KUSKAR) {
      expect(sql, k.name).toContain(
        `(${sqlString(k.name)}, ${sqlString(k.title)}, array[`,
      );
      for (const note of k.notes) expect(sql, note).toContain(sqlString(note));
    }
    expect(sql.match(/^ {2}\(/gm)).toHaveLength(NAMED_KUSKAR.length);
  });
});
