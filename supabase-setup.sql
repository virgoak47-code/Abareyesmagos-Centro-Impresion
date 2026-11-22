-- Centro de Impresión Abareyesmagos · configuración de Supabase
-- Pega TODO en Supabase > SQL Editor > Run.
-- ANTES DE EJECUTAR: cambia CAMBIA_ESTE_CORREO@ejemplo.com por el correo del dueño (el que usarás para entrar al panel).

create or replace function public.is_staff() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'email') in ('CAMBIA_ESTE_CORREO@ejemplo.com'), false);
$$;

create table if not exists public.orders (
  folio text primary key,
  name text not null check (char_length(name) between 1 and 70),
  phone text check (char_length(phone) <= 20),
  file_name text not null,
  file_size bigint not null check (file_size <= 15728640),
  file_path text not null,
  color text not null check (color in ('bn','color')),
  paper text not null check (paper in ('carta','oficio')),
  pages int not null check (pages between 1 and 300),
  copies int not null check (copies between 1 and 99),
  notes text check (char_length(notes) <= 300),
  estimate numeric not null,
  status text not null default 'Pendiente',
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;

drop policy if exists "clientes crean pedidos" on public.orders;
create policy "clientes crean pedidos" on public.orders for insert to anon, authenticated
  with check (status = 'Pendiente');
drop policy if exists "personal gestiona pedidos" on public.orders;
create policy "personal gestiona pedidos" on public.orders for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create table if not exists public.settings (
  id int primary key check (id = 1),
  rate_bn numeric not null default 1.5,
  rate_color numeric not null default 5,
  rate_legal numeric not null default 1
);
insert into public.settings (id) values (1) on conflict do nothing;
alter table public.settings enable row level security;
drop policy if exists "todos leen tarifas" on public.settings;
create policy "todos leen tarifas" on public.settings for select to anon, authenticated using (true);
drop policy if exists "personal edita tarifas" on public.settings;
create policy "personal edita tarifas" on public.settings for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Bucket privado para documentos (máx. 15 MB, solo PDF/JPG/PNG)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos','documentos', false, 15728640, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

drop policy if exists "clientes suben documentos" on storage.objects;
create policy "clientes suben documentos" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'documentos');
drop policy if exists "personal lee documentos" on storage.objects;
create policy "personal lee documentos" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.is_staff());
drop policy if exists "personal borra documentos" on storage.objects;
create policy "personal borra documentos" on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.is_staff());
