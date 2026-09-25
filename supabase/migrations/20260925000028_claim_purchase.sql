-- Hämta for everything physical: a beer, a cider and a Mystery Box prize are now claimed on the
-- guest's phone in front of whoever hands them over, the same way marker are (*_markers.sql).
--
-- claim_purchase claims one receipt: the guest may buy two beers and drink them an hour apart.
-- Marker keep claim_markers, which takes every unclaimed handful at once. Digital receipts have
-- nothing to hand over. claimed_at is the authority; a second press gets already_claimed.
--
-- Receipts written before this migration were fulfilled under the old "show the receipt" flow, so
-- they are stamped as claimed at purchase time rather than showing up as a queue at the bar.

update public.purchases
set claimed_at = created_at
where kind in ('physical', 'box') and claimed_at is null;

create function public.claim_purchase(p_player_id uuid, p_token uuid, p_purchase_id uuid)
returns public.purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.purchases;
begin
  perform private.check_player(p_player_id, p_token);

  select * into v_purchase from public.purchases p
  where p.id = p_purchase_id and p.player_id = p_player_id
  for update;
  if not found then
    raise exception 'purchase_not_found';
  end if;
  if v_purchase.kind = 'marker' then
    raise exception 'use_claim_markers';
  end if;
  if v_purchase.kind not in ('physical', 'box') then
    raise exception 'nothing_to_claim';
  end if;
  if v_purchase.claimed_at is not null then
    raise exception 'already_claimed';
  end if;

  update public.purchases set claimed_at = now() where id = p_purchase_id and claimed_at is null
  returning * into v_purchase;

  return v_purchase;
end
$$;

revoke execute on function public.claim_purchase(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_purchase(uuid, uuid, uuid) to anon, authenticated;
