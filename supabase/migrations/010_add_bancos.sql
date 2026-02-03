-- Create Bancos table
create table public.bancos (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  nome text not null,
  codigo text,
  created_at timestamp with time zone not null default now(),
  constraint bancos_pkey primary key (id),
  constraint bancos_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Enable RLS
alter table public.bancos enable row level security;

-- RLS Policies for Bancos
create policy "Users can view their own bancos" on public.bancos
  for select using (auth.uid() = user_id);

create policy "Users can insert their own bancos" on public.bancos
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own bancos" on public.bancos
  for update using (auth.uid() = user_id);

create policy "Users can delete their own bancos" on public.bancos
  for delete using (auth.uid() = user_id);

-- Add banco_padrao_id to Empresas
alter table public.empresas 
add column banco_padrao_id uuid references public.bancos(id) on delete set null;

-- Add banco_id to Contas
alter table public.contas 
add column banco_id uuid references public.bancos(id) on delete set null;
