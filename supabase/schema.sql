-- ============================================================
-- Gás de Bairro — banco de dados (Supabase / Postgres)
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Pode rodar de novo sem perder pedidos (é idempotente).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Tabelas ----------

-- Configuração do depósito (uma linha só)
create table if not exists public.loja (
  id            int primary key default 1 check (id = 1),
  preco_p13     numeric(10,2) check (preco_p13 is null or preco_p13 > 0),
  aberto        boolean not null default false,
  aviso         text check (char_length(aviso) <= 200),
  atualizado_em timestamptz not null default now()
);
insert into public.loja (id) values (1) on conflict (id) do nothing;

-- Quem pode usar o painel (usuários do Supabase Auth)
create table if not exists public.equipe (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome    text
);

create table if not exists public.pedidos (
  id             uuid primary key default gen_random_uuid(),
  numero         bigint generated always as identity,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  status         text not null default 'enviado'
                 check (status in ('enviado','em_preparacao','saiu_entrega','entregue','recusado','cancelado')),
  quantidade     int  not null check (quantidade between 1 and 10),
  troca          boolean not null default true,
  preco_unitario numeric(10,2),
  nome           text not null check (char_length(nome) between 2 and 80),
  telefone       text not null check (char_length(telefone) between 10 and 11 and telefone ~ '^[0-9]+$'),
  endereco       text not null check (char_length(endereco) between 5 and 160),
  bairro         text not null check (char_length(bairro) between 2 and 80),
  referencia     text check (char_length(referencia) <= 200),
  pagamento      text not null check (pagamento in ('dinheiro','pix','cartao')),
  troco_para     numeric(10,2) check (troco_para is null or troco_para >= 0),
  cartao_tipo    text check (cartao_tipo is null or cartao_tipo in ('debito','credito')),
  motivo         text check (char_length(motivo) <= 200),
  historico      jsonb not null default '[]'::jsonb
);
create index if not exists pedidos_criado_idx on public.pedidos (criado_em desc);
create index if not exists pedidos_status_idx on public.pedidos (status);

-- ---------- Funções auxiliares ----------

create or replace function public.eh_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.equipe where user_id = auth.uid());
$$;

-- Registra cada mudança de status com horário (usado na linha do tempo)
create or replace function public.pedidos_antes_salvar()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.historico := jsonb_build_array(jsonb_build_object('status', new.status, 'em', now()));
  elsif new.status is distinct from old.status then
    new.historico := old.historico || jsonb_build_object('status', new.status, 'em', now());
    new.atualizado_em := now();
  end if;
  return new;
end $$;

drop trigger if exists pedidos_antes_salvar on public.pedidos;
create trigger pedidos_antes_salvar before insert or update on public.pedidos
  for each row execute function public.pedidos_antes_salvar();

-- ---------- Segurança (RLS) ----------

alter table public.loja    enable row level security;
alter table public.equipe  enable row level security;
alter table public.pedidos enable row level security;

revoke all on public.pedidos from anon;
revoke all on public.equipe  from anon;

drop policy if exists loja_ler on public.loja;
create policy loja_ler on public.loja for select to anon, authenticated using (true);
drop policy if exists loja_editar on public.loja;
create policy loja_editar on public.loja for update to authenticated using (public.eh_equipe()) with check (public.eh_equipe());

drop policy if exists equipe_ler_propria on public.equipe;
create policy equipe_ler_propria on public.equipe for select to authenticated using (user_id = auth.uid());

drop policy if exists pedidos_equipe_ler on public.pedidos;
create policy pedidos_equipe_ler on public.pedidos for select to authenticated using (public.eh_equipe());
drop policy if exists pedidos_equipe_editar on public.pedidos;
create policy pedidos_equipe_editar on public.pedidos for update to authenticated using (public.eh_equipe()) with check (public.eh_equipe());

-- ---------- Funções públicas usadas pelo app do cliente ----------
-- O cliente nunca lê a tabela de pedidos: ele cria um pedido e consulta
-- só o seu, pelo id (uuid aleatório, impossível de adivinhar).

create or replace function public.criar_pedido(
  p_quantidade int, p_troca boolean,
  p_nome text, p_telefone text, p_endereco text, p_bairro text, p_referencia text,
  p_pagamento text, p_troco_para numeric, p_cartao_tipo text
) returns table (id uuid, numero bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_loja public.loja;
  v_tel  text := regexp_replace(coalesce(p_telefone,''), '\D', '', 'g');
begin
  select * into v_loja from public.loja where loja.id = 1;
  if not v_loja.aberto then
    raise exception 'O depósito está fechado no momento.' using errcode = 'P0001';
  end if;
  if p_quantidade < 1 or p_quantidade > 10 then
    raise exception 'Quantidade inválida.' using errcode = 'P0001';
  end if;
  -- Proteção simples contra abuso: no máximo 3 pedidos por telefone a cada 30 min
  if (select count(*) from public.pedidos
       where pedidos.telefone = v_tel and pedidos.criado_em > now() - interval '30 minutes') >= 3 then
    raise exception 'Muitos pedidos seguidos com este telefone. Aguarde alguns minutos.' using errcode = 'P0001';
  end if;

  return query
  insert into public.pedidos as p (quantidade, troca, preco_unitario, nome, telefone, endereco, bairro,
                              referencia, pagamento, troco_para, cartao_tipo)
  values (p_quantidade, coalesce(p_troca, true), v_loja.preco_p13, trim(p_nome), v_tel, trim(p_endereco),
          trim(p_bairro), nullif(trim(coalesce(p_referencia,'')), ''), p_pagamento,
          case when p_pagamento = 'dinheiro' then p_troco_para end,
          case when p_pagamento = 'cartao' then p_cartao_tipo end)
  returning p.id, p.numero;
end $$;

create or replace function public.ver_pedido(p_id uuid)
returns table (
  id uuid, numero bigint, criado_em timestamptz, status text, quantidade int, troca boolean,
  preco_unitario numeric, nome text, endereco text, bairro text, referencia text,
  pagamento text, troco_para numeric, cartao_tipo text, motivo text, historico jsonb
) language sql stable security definer set search_path = public as $$
  select p.id, p.numero, p.criado_em, p.status, p.quantidade, p.troca, p.preco_unitario, p.nome,
         p.endereco, p.bairro, p.referencia, p.pagamento, p.troco_para, p.cartao_tipo, p.motivo, p.historico
    from public.pedidos p where p.id = p_id;
$$;

-- O cliente só pode cancelar enquanto o depósito ainda não aceitou
create or replace function public.cancelar_pedido(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.pedidos set status = 'cancelado' where pedidos.id = p_id and status = 'enviado';
  return found;
end $$;

revoke all on function public.criar_pedido(int, boolean, text, text, text, text, text, text, numeric, text) from public;
revoke all on function public.ver_pedido(uuid) from public;
revoke all on function public.cancelar_pedido(uuid) from public;
grant execute on function public.criar_pedido(int, boolean, text, text, text, text, text, text, numeric, text) to anon, authenticated;
grant execute on function public.ver_pedido(uuid) to anon, authenticated;
grant execute on function public.cancelar_pedido(uuid) to anon, authenticated;
grant execute on function public.eh_equipe() to authenticated;

-- ============================================================
-- DEPOIS de rodar o script:
-- 1. Authentication → Users → "Add user": crie o login do depósito (e-mail + senha).
-- 2. Authentication → Sign In / Providers: desligue "Allow new users to sign up".
-- 3. Rode a linha abaixo trocando o e-mail para liberar o painel:
--
--    insert into public.equipe (user_id, nome)
--    select id, 'Depósito' from auth.users where email = 'SEU-EMAIL@exemplo.com';
-- ============================================================
