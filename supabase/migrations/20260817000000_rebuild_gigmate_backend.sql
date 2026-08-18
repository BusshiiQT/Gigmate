-- Keep updated_at columns current whenever a row is updated.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Gig work sessions and earnings.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (
    platform in ('Uber', 'Lyft', 'DoorDash', 'Instacart', 'AmazonFlex', 'Other')
  ),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  gross_cents integer not null,
  tips_cents integer not null default 0,
  miles numeric not null default 0,
  fuel_cost_cents integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entries_user_id_started_at_idx
  on public.entries (user_id, started_at desc);

create index entries_started_at_idx
  on public.entries (started_at);

create index entries_user_id_ended_at_idx
  on public.entries (user_id, ended_at);

create trigger entries_set_updated_at
before update on public.entries
for each row
execute function public.set_updated_at();

alter table public.entries enable row level security;

create policy "Users can select their own entries"
on public.entries
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own entries"
on public.entries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own entries"
on public.entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own entries"
on public.entries
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Per-user calculation preferences.
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  mileage_rate_cents integer not null default 67,
  tax_rate_bps integer not null default 1500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();

alter table public.settings enable row level security;

create policy "Users can select their own settings"
on public.settings
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update their own settings"
on public.settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Insert default settings after a new Auth user is created.
create or replace function public.handle_new_user_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_settings
after insert on auth.users
for each row
execute function public.handle_new_user_settings();

-- Waitlist writes are performed only by the server-side service role.
create table public.waitlist_emails (
  email text primary key
);

create or replace function public.normalize_waitlist_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email = lower(new.email);
  return new;
end;
$$;

create trigger waitlist_emails_normalize_email
before insert or update on public.waitlist_emails
for each row
execute function public.normalize_waitlist_email();

alter table public.waitlist_emails enable row level security;
