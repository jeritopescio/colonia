-- Colonia: base compartida sin login (cada celu elige quién es, como en Maldad).
-- Se pega entero en Supabase → SQL Editor → Run. Se puede volver a correr sin romper nada.

-- Cada integrante: nivel, monedas y sus cosas.
create table if not exists public.jugadores (
  id text primary key,                       -- jero, viqui, pachi...
  xp int not null default 0,
  monedas int not null default 0,
  datos jsonb not null default '{}'::jsonb,  -- cosas compradas, días que entró, logros
  actualizado timestamptz not null default now()
);

-- Cada foto subida a una misión es una figurita.
create table if not exists public.figuritas (
  id uuid primary key default gen_random_uuid(),
  jugador text not null references public.jugadores(id),
  mision text not null,
  foto text not null,                        -- ruta dentro del bucket "figuritas"
  creada timestamptz not null default now(),
  unique (jugador, mision)
);

-- Regalos del kiosco entre integrantes.
create table if not exists public.regalos (
  id uuid primary key default gen_random_uuid(),
  de text not null references public.jugadores(id),
  para text not null references public.jugadores(id),
  item text not null,
  creado timestamptz not null default now()
);

insert into public.jugadores (id) values
  ('jero'),('viqui'),('pachi'),('juani'),('nico'),('rochi'),('jose'),
  ('nachote'),('juli'),('rich'),('sofi'),('chino'),('grego')
on conflict (id) do nothing;

-- Sin login: la app entra con la clave pública. Cualquiera con el link de la app podría leer y escribir.
do $$
declare t text;
begin
  foreach t in array array['jugadores','figuritas','regalos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "app lee" on public.%I', t);
    execute format('drop policy if exists "app agrega" on public.%I', t);
    execute format('drop policy if exists "app edita" on public.%I', t);
    execute format('create policy "app lee" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "app agrega" on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('create policy "app edita" on public.%I for update to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Fotos: bucket público con las figuritas cuadradas.
insert into storage.buckets (id, name, public) values ('figuritas', 'figuritas', true)
on conflict (id) do nothing;
drop policy if exists "colonia ve fotos" on storage.objects;
drop policy if exists "colonia sube fotos" on storage.objects;
drop policy if exists "colonia cambia fotos" on storage.objects;
create policy "colonia ve fotos" on storage.objects for select to anon, authenticated using (bucket_id = 'figuritas');
create policy "colonia sube fotos" on storage.objects for insert to anon, authenticated with check (bucket_id = 'figuritas');
create policy "colonia cambia fotos" on storage.objects for update to anon, authenticated using (bucket_id = 'figuritas') with check (bucket_id = 'figuritas');

-- Para que las figuritas y la carpa se actualicen al instante en los otros celus.
do $$ begin alter publication supabase_realtime add table public.jugadores; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.figuritas; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.regalos; exception when duplicate_object then null; end $$;
