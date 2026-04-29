export const BETA_SQL_GUIDE_SUMMARY = {
  ko: {
    title: 'Beta Automation SQL 가이드',
    bullets: [
      '테이블: public.beta_automation_states',
      '핵심 컬럼: id(text), owner_id(uuid), workspace_key(text), payload(jsonb), updated_at(timestamptz)',
      'RLS 활성화 후 authenticated 대상 select/insert/update/delete 정책 필요',
      '정책 핵심 조건: owner_id = auth.uid()',
    ],
  },
  en: {
    title: 'Beta Automation SQL guide',
    bullets: [
      'Table: public.beta_automation_states',
      'Key columns: id(text), owner_id(uuid), workspace_key(text), payload(jsonb), updated_at(timestamptz)',
      'Enable RLS and define select/insert/update/delete policies for authenticated users',
      'Core policy condition: owner_id = auth.uid()',
    ],
  },
} as const;

export const BETA_SQL_GUIDE_SNIPPET = `create table if not exists public.beta_automation_states (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.beta_automation_states enable row level security;

create policy "beta_automation_select_own"
  on public.beta_automation_states
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy "beta_automation_insert_own"
  on public.beta_automation_states
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "beta_automation_update_own"
  on public.beta_automation_states
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "beta_automation_delete_own"
  on public.beta_automation_states
  for delete
  to authenticated
  using (owner_id = auth.uid());

create index if not exists idx_beta_automation_states_owner_id
  on public.beta_automation_states (owner_id);
`;
