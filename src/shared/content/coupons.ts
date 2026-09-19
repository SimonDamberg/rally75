// Kupong copy shared by both apps: the tier names show up on the printed ticket, on the guest's
// reveal and in the GM feed, so they cannot live in client.ts or gm.ts alone. Guest screens use
// KUPONG in client.ts, the GM page GM_COUPONS in gm.ts.

/** Brons, silver, guld. Keyed by the tier column in public.coupons. */
export const COUPON_TIER_COPY = {
  1: { name: 'Bronskupong', short: 'Brons' },
  2: { name: 'Silverkupong', short: 'Silver' },
  3: { name: 'Guldkupong', short: 'Guld' },
} as const

/** Everything printed on a ticket. Kept short: it has to fit on a card the size of a beer mat. */
export const TICKET = {
  brand: 'Mr Green Nätcasino',
  scan: 'Skanna koden',
  cash: 'Lös in på telefonen',
  once: 'Gäller en (1) inlösning',
  legal: 'Ingen kontant utbetalning. RallyMynt saknar värde utanför festen.',
} as const
