-- Business Hub: extensao incremental do schema publico existente.
-- Nao cria outro projeto/schema e nao altera nem remove dados atuais.

create table if not exists public.client_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  role text not null default 'client' check (role in ('client','client_manager')),
  created_at timestamptz not null default now(),
  unique(user_id, client_id)
);
create index if not exists client_users_user_idx on public.client_users(user_id);
create index if not exists client_users_client_idx on public.client_users(client_id);

create or replace function public.is_client_of(target_client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.client_users cu where cu.user_id = auth.uid() and cu.client_id = target_client);
$$;
revoke all on function public.is_client_of(uuid) from public;
grant execute on function public.is_client_of(uuid) to authenticated;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  contract_number text not null unique,
  title text not null,
  description text not null default '',
  plan_name text not null default '',
  setup_fee numeric(12,2) not null default 0 check(setup_fee >= 0),
  monthly_value numeric(12,2) not null default 0 check(monthly_value >= 0),
  billing_frequency text not null default 'monthly' check(billing_frequency in ('monthly','quarterly','semiannual','annual','one_time')),
  start_date date not null,
  end_date date,
  renewal_type text not null default 'manual' check(renewal_type in ('manual','automatic')),
  status text not null default 'draft' check(status in ('draft','pending_signature','active','suspended','expired','cancelled')),
  document_url text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contracts_client_idx on public.contracts(client_id, start_date desc);
create index if not exists contracts_status_idx on public.contracts(status, end_date);

create table if not exists public.marketing_calendar (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  platform text not null default 'Instagram',
  content_type text not null default 'Reels',
  objective text not null default '',
  caption text not null default '',
  script text not null default '',
  hashtags text not null default '',
  scheduled_at timestamptz,
  media_url text,
  status text not null default 'idea' check(status in ('idea','planning','production','review','approved','scheduled','published','changes_requested','cancelled')),
  admin_notes text not null default '',
  client_feedback text not null default '',
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketing_calendar_client_date_idx on public.marketing_calendar(client_id, scheduled_at);
create index if not exists marketing_calendar_status_idx on public.marketing_calendar(status, scheduled_at);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  kind text not null check(kind in ('income','expense')),
  category text not null,
  description text not null,
  amount numeric(12,2) not null check(amount > 0),
  competence_date date not null,
  due_date date,
  paid_at date,
  payment_method text not null default '',
  status text not null default 'pending' check(status in ('pending','paid','overdue','cancelled')),
  receipt_url text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists financial_transactions_due_idx on public.financial_transactions(status, due_date);
create index if not exists financial_transactions_client_idx on public.financial_transactions(client_id, competence_date desc);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null check(amount > 0),
  issue_date date not null default current_date,
  due_date date not null,
  paid_at date,
  status text not null default 'pending' check(status in ('pending','paid','overdue','cancelled','partial')),
  payment_reference text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists invoices_client_due_idx on public.invoices(client_id, due_date desc);

create table if not exists public.hub_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  message text not null default '',
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check(status in ('open','in_progress','answered','closed')),
  response text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at triggers (safe to rerun)
do $$ begin
  if not exists(select 1 from pg_trigger where tgname='trg_contracts_updated') then create trigger trg_contracts_updated before update on public.contracts for each row execute function public.set_updated_at(); end if;
  if not exists(select 1 from pg_trigger where tgname='trg_marketing_updated') then create trigger trg_marketing_updated before update on public.marketing_calendar for each row execute function public.set_updated_at(); end if;
  if not exists(select 1 from pg_trigger where tgname='trg_financial_updated') then create trigger trg_financial_updated before update on public.financial_transactions for each row execute function public.set_updated_at(); end if;
  if not exists(select 1 from pg_trigger where tgname='trg_requests_updated') then create trigger trg_requests_updated before update on public.client_requests for each row execute function public.set_updated_at(); end if;
end $$;

-- RLS: administradores gerenciam tudo; cliente acessa somente registros vinculados.
do $$ declare t text; begin
  foreach t in array array['client_users','contracts','marketing_calendar','financial_transactions','invoices','hub_notifications','client_requests'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- client_users: admin gerencia vínculos; usuário só lê seu próprio vínculo.
 drop policy if exists client_users_admin_all on public.client_users;
create policy client_users_admin_all on public.client_users for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists client_users_self_read on public.client_users;
create policy client_users_self_read on public.client_users for select to authenticated using(user_id = auth.uid());

-- Tabelas com client_id direto.
do $$ declare t text; begin
  foreach t in array array['contracts','marketing_calendar','invoices','client_requests'] loop
    execute format('drop policy if exists %I on public.%I', t||'_admin_all', t);
    execute format('create policy %I on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())', t||'_admin_all', t);
    execute format('drop policy if exists %I on public.%I', t||'_client_read', t);
    execute format('create policy %I on public.%I for select to authenticated using(public.is_client_of(client_id))', t||'_client_read', t);
  end loop;
end $$;

-- Aprovação de conteúdo somente por função controlada; não conceder UPDATE direto ao cliente.
create or replace function public.client_review_content(target_id uuid, decision text, feedback_text text default '')
returns void language plpgsql security definer set search_path = public as $$
declare target_client uuid;
begin
  if decision not in ('approved','changes_requested') then raise exception 'Invalid decision'; end if;
  select client_id into target_client from public.marketing_calendar where id = target_id;
  if target_client is null or not public.is_client_of(target_client) then raise exception 'Not authorized'; end if;
  update public.marketing_calendar set status = decision, client_feedback = left(coalesce(feedback_text,''),3000), approved_at = case when decision='approved' then now() else null end where id=target_id;
end; $$;
revoke all on function public.client_review_content(uuid,text,text) from public;
grant execute on function public.client_review_content(uuid,text,text) to authenticated;

-- Financeiro: cliente lê apenas suas próprias cobranças/lançamentos vinculados.
drop policy if exists financial_transactions_admin_all on public.financial_transactions;
create policy financial_transactions_admin_all on public.financial_transactions for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists financial_transactions_client_read on public.financial_transactions;
create policy financial_transactions_client_read on public.financial_transactions for select to authenticated using(client_id is not null and public.is_client_of(client_id));

drop policy if exists invoices_admin_all on public.invoices;
create policy invoices_admin_all on public.invoices for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists invoices_client_read on public.invoices;
create policy invoices_client_read on public.invoices for select to authenticated using(public.is_client_of(client_id));

-- Notificações: admin pode criar/gerenciar; usuário lê apenas as próprias.
drop policy if exists hub_notifications_admin_all on public.hub_notifications;
create policy hub_notifications_admin_all on public.hub_notifications for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists hub_notifications_self_read on public.hub_notifications;
create policy hub_notifications_self_read on public.hub_notifications for select to authenticated using(user_id = auth.uid() or (client_id is not null and public.is_client_of(client_id)));

-- Clientes leem somente o próprio cadastro e tarefas/histórico associados.
drop policy if exists clients_client_read on public.clients;
create policy clients_client_read on public.clients for select to authenticated using(public.is_client_of(id));
drop policy if exists client_tasks_client_read on public.client_tasks;
create policy client_tasks_client_read on public.client_tasks for select to authenticated using(public.is_client_of(client_id));
drop policy if exists client_activities_client_read on public.client_activities;
create policy client_activities_client_read on public.client_activities for select to authenticated using(public.is_client_of(client_id));

-- O cliente só abre solicitações para sua própria empresa; administradores respondem.
drop policy if exists client_requests_client_insert on public.client_requests;
create policy client_requests_client_insert on public.client_requests for insert to authenticated with check(public.is_client_of(client_id));
drop policy if exists client_requests_client_read on public.client_requests;
create policy client_requests_client_read on public.client_requests for select to authenticated using(public.is_client_of(client_id));
-- Clientes não recebem permissão direta de UPDATE para não alterar status/respostas administrativas.

-- O cadastro interno de clientes continua protegido como antes: somente admins.
