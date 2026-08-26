-- Abort with useful counts if legacy data must be repaired before validation.
do $$
declare
  invalid_entries bigint;
  invalid_settings bigint;
begin
  select count(*) into invalid_entries
  from public.entries
  where gross_cents < 0
     or tips_cents < 0
     or fuel_cost_cents < 0
     or miles < 0
     or ended_at <= started_at;

  select count(*) into invalid_settings
  from public.settings
  where mileage_rate_cents < 0
     or tax_rate_bps < 0
     or tax_rate_bps > 10000;

  if invalid_entries > 0 or invalid_settings > 0 then
    raise exception
      'Validation constraints not added: % invalid entries row(s), % invalid settings row(s)',
      invalid_entries,
      invalid_settings;
  end if;
end;
$$;

alter table public.entries
  add constraint entries_gross_cents_nonnegative check (gross_cents >= 0),
  add constraint entries_tips_cents_nonnegative check (tips_cents >= 0),
  add constraint entries_fuel_cost_cents_nonnegative check (fuel_cost_cents >= 0),
  add constraint entries_miles_nonnegative check (miles >= 0),
  add constraint entries_end_after_start check (ended_at > started_at);

alter table public.settings
  add constraint settings_mileage_rate_cents_nonnegative check (mileage_rate_cents >= 0),
  add constraint settings_tax_rate_bps_range check (
    tax_rate_bps >= 0 and tax_rate_bps <= 10000
  );
