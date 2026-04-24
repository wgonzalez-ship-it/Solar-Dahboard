create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workspace_slug text not null default 'solaris-power',
  email text not null,
  full_name text not null default '',
  role text not null default 'viewer' check (role in ('admin', 'executive', 'sales', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_records (
  id uuid primary key default gen_random_uuid(),
  workspace_slug text not null default 'solaris-power',
  region text not null,
  municipality text not null,
  product text not null,
  year integer not null,
  month integer not null,
  units integer not null default 0,
  revenue numeric(14,2) not null default 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.network_locations (
  id uuid primary key default gen_random_uuid(),
  workspace_slug text not null default 'solaris-power',
  region text not null,
  name text not null,
  municipality text not null,
  type text not null,
  leaders integer not null default 0,
  sellers integer not null default 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kpi_targets (
  id bigint generated always as identity primary key,
  workspace_slug text not null unique,
  revenue numeric(14,2) not null default 0,
  units integer not null default 0,
  locations integer not null default 0,
  sellers integer not null default 0,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.risk_assessments (
  id bigint generated always as identity primary key,
  workspace_slug text not null,
  signal_id text not null,
  exposure integer not null default 2,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_slug, signal_id)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  workspace_slug text not null default 'solaris-power',
  table_name text not null,
  operation text not null,
  row_id text,
  actor_id uuid,
  actor_email text,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create or replace function public.current_workspace_slug()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select workspace_slug from public.profiles where user_id = auth.uid()),
    'solaris-power'
  );
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where user_id = auth.uid()),
    'viewer'
  );
$$;

create or replace function public.has_any_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = any (allowed_roles);
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.attach_actor_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
  else
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace text;
  v_row_id text;
  v_actor_email text;
begin
  v_workspace := coalesce(new.workspace_slug, old.workspace_slug, public.current_workspace_slug(), 'solaris-power');
  v_row_id := coalesce(new.id::text, old.id::text, old.user_id::text, new.user_id::text, old.signal_id, new.signal_id, v_workspace);
  select email into v_actor_email from public.profiles where user_id = auth.uid();

  insert into public.audit_log (
    workspace_slug,
    table_name,
    operation,
    row_id,
    actor_id,
    actor_email,
    old_data,
    new_data
  )
  values (
    v_workspace,
    tg_table_name,
    tg_op,
    v_row_id,
    auth.uid(),
    v_actor_email,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, workspace_slug, email, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'workspace_slug', 'solaris-power'),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'viewer'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists sales_records_touch_updated_at on public.sales_records;
create trigger sales_records_touch_updated_at
before update on public.sales_records
for each row execute procedure public.touch_updated_at();

drop trigger if exists network_locations_touch_updated_at on public.network_locations;
create trigger network_locations_touch_updated_at
before update on public.network_locations
for each row execute procedure public.touch_updated_at();

drop trigger if exists kpi_targets_touch_updated_at on public.kpi_targets;
create trigger kpi_targets_touch_updated_at
before update on public.kpi_targets
for each row execute procedure public.touch_updated_at();

drop trigger if exists risk_assessments_touch_updated_at on public.risk_assessments;
create trigger risk_assessments_touch_updated_at
before update on public.risk_assessments
for each row execute procedure public.touch_updated_at();

drop trigger if exists sales_records_attach_actor on public.sales_records;
create trigger sales_records_attach_actor
before insert or update on public.sales_records
for each row execute procedure public.attach_actor_fields();

drop trigger if exists network_locations_attach_actor on public.network_locations;
create trigger network_locations_attach_actor
before insert or update on public.network_locations
for each row execute procedure public.attach_actor_fields();

drop trigger if exists kpi_targets_attach_actor on public.kpi_targets;
create trigger kpi_targets_attach_actor
before insert or update on public.kpi_targets
for each row execute procedure public.attach_actor_fields();

drop trigger if exists risk_assessments_attach_actor on public.risk_assessments;
create trigger risk_assessments_attach_actor
before insert or update on public.risk_assessments
for each row execute procedure public.attach_actor_fields();

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
after insert or update or delete on public.profiles
for each row execute procedure public.audit_row_change();

drop trigger if exists sales_records_audit on public.sales_records;
create trigger sales_records_audit
after insert or update or delete on public.sales_records
for each row execute procedure public.audit_row_change();

drop trigger if exists network_locations_audit on public.network_locations;
create trigger network_locations_audit
after insert or update or delete on public.network_locations
for each row execute procedure public.audit_row_change();

drop trigger if exists kpi_targets_audit on public.kpi_targets;
create trigger kpi_targets_audit
after insert or update or delete on public.kpi_targets
for each row execute procedure public.audit_row_change();

drop trigger if exists risk_assessments_audit on public.risk_assessments;
create trigger risk_assessments_audit
after insert or update or delete on public.risk_assessments
for each row execute procedure public.audit_row_change();

alter table public.profiles enable row level security;
alter table public.sales_records enable row level security;
alter table public.network_locations enable row level security;
alter table public.kpi_targets enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "profiles select workspace" on public.profiles;
create policy "profiles select workspace"
on public.profiles for select
to authenticated
using (workspace_slug = public.current_workspace_slug());

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
on public.profiles for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "profiles update admin" on public.profiles;
create policy "profiles update admin"
on public.profiles for update
to authenticated
using (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin'])
)
with check (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin'])
);

drop policy if exists "sales select workspace" on public.sales_records;
create policy "sales select workspace"
on public.sales_records for select
to authenticated
using (workspace_slug = public.current_workspace_slug());

drop policy if exists "sales insert team" on public.sales_records;
create policy "sales insert team"
on public.sales_records for insert
to authenticated
with check (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive', 'sales'])
);

drop policy if exists "sales update team" on public.sales_records;
create policy "sales update team"
on public.sales_records for update
to authenticated
using (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive', 'sales'])
)
with check (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive', 'sales'])
);

drop policy if exists "sales delete executive" on public.sales_records;
create policy "sales delete executive"
on public.sales_records for delete
to authenticated
using (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive'])
);

drop policy if exists "network select workspace" on public.network_locations;
create policy "network select workspace"
on public.network_locations for select
to authenticated
using (workspace_slug = public.current_workspace_slug());

drop policy if exists "network insert team" on public.network_locations;
create policy "network insert team"
on public.network_locations for insert
to authenticated
with check (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive', 'sales'])
);

drop policy if exists "network update team" on public.network_locations;
create policy "network update team"
on public.network_locations for update
to authenticated
using (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive', 'sales'])
)
with check (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive', 'sales'])
);

drop policy if exists "network delete executive" on public.network_locations;
create policy "network delete executive"
on public.network_locations for delete
to authenticated
using (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive'])
);

drop policy if exists "targets select workspace" on public.kpi_targets;
create policy "targets select workspace"
on public.kpi_targets for select
to authenticated
using (workspace_slug = public.current_workspace_slug());

drop policy if exists "targets manage exec" on public.kpi_targets;
create policy "targets manage exec"
on public.kpi_targets for all
to authenticated
using (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive'])
)
with check (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive'])
);

drop policy if exists "risks select workspace" on public.risk_assessments;
create policy "risks select workspace"
on public.risk_assessments for select
to authenticated
using (workspace_slug = public.current_workspace_slug());

drop policy if exists "risks manage exec" on public.risk_assessments;
create policy "risks manage exec"
on public.risk_assessments for all
to authenticated
using (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive'])
)
with check (
  workspace_slug = public.current_workspace_slug()
  and public.has_any_role(array['admin', 'executive'])
);

drop policy if exists "audit select workspace" on public.audit_log;
create policy "audit select workspace"
on public.audit_log for select
to authenticated
using (workspace_slug = public.current_workspace_slug());
