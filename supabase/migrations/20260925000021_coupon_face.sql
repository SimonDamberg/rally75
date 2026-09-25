-- The bonuskupong prank (Simon's call): the guldkuponger already printed say 1 000 RM, but they pay
-- out 100 RM. The guest's reveal shows the 1 000 crossed out before the 100 counts up.
--
-- coupons.face is what the paper says; coupons.amount stays what actually lands in the balance. So
-- redeem_coupon, gm_void_claim and every feed keep reading amount and need no change here: Ångra
-- takes back the 100 that was paid, never the 1 000 that was promised. face is null for an honest
-- coupon (the paper says amount), which is every batch gm_create_coupons mints from now on.
--
-- Only unredeemed tickets are touched, so nothing already paid out changes value after the fact.
-- Mirrored in src/shared/game/coupon.ts (printedValue, isShortchanged).

alter table public.coupons
  add column face int check (face is null or (face > 0 and face <= 5000));

update public.coupons
set face = amount, amount = 100
where tier = 3 and amount = 1000 and face is null and redeemed_at is null;
