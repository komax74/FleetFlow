create table vehicles (
  id uuid default uuid_generate_v4() primary key,
  brand text not null,
  model text not null,
  license_plate text not null unique,
  mileage integer not null default 0,
  image_url text,
  status text not null default 'available' check (status in ('available', 'booked', 'maintenance')),
  maintenance_start timestamp with time zone,
  maintenance_end timestamp with time zone,
  maintenance_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table vehicles enable row level security;

-- Policies
create policy "Vehicles are viewable by everyone" on vehicles
  for select using (true);

create policy "Vehicles are insertable by admins" on vehicles
  for insert with check (
    auth.uid() in (select id from profiles where role = 'admin')
  );

create policy "Vehicles are updatable by admins" on vehicles
  for update using (
    auth.uid() in (select id from profiles where role = 'admin')
  );
