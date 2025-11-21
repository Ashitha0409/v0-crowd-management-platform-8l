-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Events Table
create table public.events (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  location text not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  capacity integer not null,
  status text not null default 'planned'::text check (status in ('planned', 'active', 'completed', 'cancelled')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  constraint events_pkey primary key (id)
);

-- Zones Table
create table public.zones (
  id uuid not null default gen_random_uuid (),
  event_id uuid not null references public.events(id),
  name text not null,
  description text null,
  capacity integer not null,
  coordinates jsonb null,
  zone_type text not null check (zone_type in ('stage', 'entrance', 'food', 'vip', 'parking', 'backstage', 'general')),
  created_at timestamp with time zone not null default now(),
  constraint zones_pkey primary key (id)
);

-- Users Table
create table public.users (
  id uuid not null default gen_random_uuid (),
  email text not null unique,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('user', 'responder', 'admin')),
  responder_type text null check (responder_type in ('medical', 'security', 'fire', 'technical')),
  phone text null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  constraint users_pkey primary key (id)
);

-- Incidents Table
create table public.incidents (
  id uuid not null default gen_random_uuid (),
  event_id uuid not null references public.events(id),
  zone_id uuid references public.zones(id),
  incident_id text not null,
  type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'active'::text check (status in ('active', 'claimed', 'investigating', 'resolved', 'escalated')),
  title text not null,
  description text not null,
  location text not null,
  reported_by uuid references public.users(id),
  assigned_to uuid references public.users(id),
  reported_at timestamp with time zone not null default now(),
  resolved_at timestamp with time zone null,
  response_time_minutes integer null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  constraint incidents_pkey primary key (id)
);

-- Crowd Density Table
create table public.crowd_density (
  id uuid not null default gen_random_uuid (),
  event_id uuid not null references public.events(id),
  zone_id uuid not null references public.zones(id),
  timestamp timestamp with time zone not null default now(),
  current_count integer not null,
  density_percentage integer not null,
  prediction_15min integer null,
  prediction_30min integer null,
  ai_confidence integer null,
  created_at timestamp with time zone not null default now(),
  constraint crowd_density_pkey primary key (id)
);

-- Anomaly Detections Table
create table public.anomaly_detections (
  id uuid not null default gen_random_uuid (),
  event_id uuid not null references public.events(id),
  camera_id text not null,
  zone_id uuid references public.zones(id),
  detection_type text not null check (detection_type in ('crowd_behavior', 'abandoned_object', 'violence', 'unusual_movement', 'gathering')),
  confidence integer not null,
  description text not null,
  status text not null default 'active'::text check (status in ('active', 'investigating', 'resolved', 'false_positive')),
  bounding_box jsonb null,
  image_url text null,
  detected_at timestamp with time zone not null default now(),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  constraint anomaly_detections_pkey primary key (id)
);

-- Lost Persons Table
create table public.lost_persons (
  id uuid not null default gen_random_uuid (),
  event_id uuid null references public.events(id),
  reporter_name text null,
  reporter_contact text not null,
  name text not null, -- person_name in interface, mapped to name here for simplicity or update interface
  age integer null,
  description text not null,
  last_seen_location text null,
  last_seen_time timestamp with time zone null,
  photo_url text null,
  status text not null default 'active'::text check (status in ('active', 'found', 'closed')),
  found_location text null,
  found_time timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  constraint lost_persons_pkey primary key (id)
);

-- System Metrics Table
create table public.system_metrics (
  id uuid not null default gen_random_uuid (),
  event_id uuid not null references public.events(id),
  metric_type text not null,
  value jsonb not null,
  timestamp timestamp with time zone not null default now(),
  constraint system_metrics_pkey primary key (id)
);

-- Enable Row Level Security (RLS)
alter table public.events enable row level security;
alter table public.zones enable row level security;
alter table public.users enable row level security;
alter table public.incidents enable row level security;
alter table public.crowd_density enable row level security;
alter table public.anomaly_detections enable row level security;
alter table public.lost_persons enable row level security;
alter table public.system_metrics enable row level security;

-- Create Policies (Open access for demo purposes - RESTRICT IN PRODUCTION)
create policy "Enable read access for all users" on public.events for select using (true);
create policy "Enable read access for all users" on public.zones for select using (true);
create policy "Enable read access for all users" on public.users for select using (true);
create policy "Enable read access for all users" on public.incidents for select using (true);
create policy "Enable read access for all users" on public.crowd_density for select using (true);
create policy "Enable read access for all users" on public.anomaly_detections for select using (true);
create policy "Enable read access for all users" on public.lost_persons for select using (true);
create policy "Enable read access for all users" on public.system_metrics for select using (true);

create policy "Enable insert access for all users" on public.incidents for insert with check (true);
create policy "Enable insert access for all users" on public.lost_persons for insert with check (true);
create policy "Enable insert access for all users" on public.anomaly_detections for insert with check (true);
create policy "Enable insert access for all users" on public.crowd_density for insert with check (true);

-- Create Storage Buckets (if not exists)
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true) on conflict do nothing;

-- Storage Policies
create policy "Public Access" on storage.objects for select using ( bucket_id = 'uploads' );
create policy "Public Upload" on storage.objects for insert with check ( bucket_id = 'uploads' );
