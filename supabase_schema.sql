-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Tenants Table
create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  logo_url text,
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Profiles Table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete restrict,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Products Table
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  category text,
  price numeric(10,2),
  raw_link text not null,
  short_link text unique,
  image_url text,
  generated_copy text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;

-- Policies for tenants
create policy "Tenants are viewable by everyone." on public.tenants
  for select using (true);
create policy "Tenants are created by their owners." on public.tenants
  for insert with check (auth.uid() = owner_id);
create policy "Tenants are editable by their owners." on public.tenants
  for update using (auth.uid() = owner_id);

-- Policies for profiles
create policy "Profiles are viewable by their owners." on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles are editable by their owners." on public.profiles
  for update using (auth.uid() = id);

-- Policies for products
create policy "Products are viewable by everyone." on public.products
  for select using (true);
create policy "Products are viewable, created and editable by tenant owner." on public.products
  for all using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

-- Create Storage Buckets
insert into storage.buckets (id, name, public) values ('logos', 'logos', true);
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

-- Storage Policies
create policy "Logos are viewable by everyone." on storage.objects
  for select using (bucket_id = 'logos');
create policy "Logos can be uploaded by authenticated users." on storage.objects
  for insert with check (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "Product images are viewable by everyone." on storage.objects
  for select using (bucket_id = 'product-images');
create policy "Product images can be uploaded by authenticated users." on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
