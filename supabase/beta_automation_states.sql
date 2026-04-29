-- Beta automation state table (frontend live mode)
-- Required env:
-- - VITE_SUPABASE_BETA_TABLE=beta_automation_states (optional, default matches this file)
-- - VITE_SUPABASE_BETA_WORKSPACE_KEY=<workspace-key>
--
-- Live mode expects authenticated users.
-- Row identity in app: <workspace_key>:<auth.uid()>

create table if not exists public.beta_automation_states (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_beta_automation_states_owner_workspace
  on public.beta_automation_states (owner_id, workspace_key);

alter table public.beta_automation_states enable row level security;

drop policy if exists "beta_automation_select_own" on public.beta_automation_states;
create policy "beta_automation_select_own"
  on public.beta_automation_states
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "beta_automation_insert_own" on public.beta_automation_states;
create policy "beta_automation_insert_own"
  on public.beta_automation_states
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "beta_automation_update_own" on public.beta_automation_states;
create policy "beta_automation_update_own"
  on public.beta_automation_states
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "beta_automation_delete_own" on public.beta_automation_states;
create policy "beta_automation_delete_own"
  on public.beta_automation_states
  for delete
  to authenticated
  using (owner_id = auth.uid());
