// Swedish display formatting. Thousands are grouped with a no-break space so "1 000 RM" never wraps.
// The currency is RallyMynt (RM), never kronor.

const NBSP = "\u00a0";

export function fmtInt(n: number): string {
  const r = Math.round(n);
  const sign = r < 0 ? "-" : "";
  return (
    sign +
    Math.abs(r)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  );
}

export function fmtRm(n: number): string {
  return `${fmtInt(n)}${NBSP}RM`;
}

export function fmtRmLong(n: number): string {
  return `${fmtInt(n)}${NBSP}RallyMynt`;
}

/** 2.59 -> "2,59" */
export function fmtOdds(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/** Duplicate names are allowed, so players are shown with their tag: "Simon #42". */
export function playerLabel(name: string, tag: number): string {
  return `${name} #${tag}`;
}

const DEFAULT_METERS = 2140;

/** "2 140 m voltstart" -> 2140. Falls back to 2140 if the text has no distance. (\s covers no-break spaces.) */
export function distMeters(dist: string): number {
  const m = dist.match(/^([\d\s]+?)\s*m\b/);
  if (!m) return DEFAULT_METERS;
  const n = Number(m[1].replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_METERS;
}
